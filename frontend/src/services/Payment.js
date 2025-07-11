import { toast } from 'react-toastify';
import instance from '../lib/axios/axiosInstance';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      reject(true);
    };

    document.body.appendChild(script);
  });
}

export const initiatePayment = async (
  fullName,
  email,
  data,
  navigate,
  setIsAddProductModal,
) => {
  const toastId = toast.loading('Loading...');

  try {
    // load the script of checkout page

    const res = await loadScript(
      'https://checkout.razorpay.com/v1/checkout.js',
    );

    if (!res) {
      toast.error('Razorpay SDK failed to load');
      return;
    }

    // initiate the order
    const orderResponse = await instance.post('/v1/payment/capture');

    if (!orderResponse.data.success) {
      throw new Error(orderResponse?.data.message);
    }

    // create options object for modal
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      currency: orderResponse?.data.data.currency,
      amount: orderResponse?.data.data.amount,
      order_id: orderResponse?.data.data.id,
      name: 'LzyCrazy',
      description: 'Thank you for listing the product',
      prefill: {
        name: `${fullName}`,
        email: email,
      },
      handler: function (response) {
        verifyPayment({ ...response });
        console.log(response);
        createListing(data, navigate, setIsAddProductModal);
      },
    };

    const paymentObject = new Razorpay(options);
    paymentObject.open();

    paymentObject.on('payment.failed', function (response) {
      toast.error('oops!, payment failed');
      console.log(error);
    });

    console.log('Modal opened');
  } catch (error) {
    console.log('PAYMENT API ERROR.....', error);
    if (!error.response?.data.allowed) {
      toast.error("You can't do this action.");
    }
  }

  toast.dismiss(toastId);
};

async function verifyPayment(bodyData) {
  const toastId = toast.loading('Verifying payment...');

  try {
    const response = await instance.post('/v1/payment/verify', bodyData);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    toast.success('Payment verification success');
    console.log('Payment verified', response.data);
  } catch (error) {
    console.log('PAYMENT VERIFY ERROR....', error);
    toast.error('Payment verification Failed');
  }

  toast.dismiss(toastId);
}

export async function createListing(formData, navigate, setIsAddProductModal) {
  const toastId = toast.loading('product listing in progress');

  async function uploadImageToCloudinary(imageFiles) {
    const photos = [];

    for (const file of imageFiles) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      try {
        const response = await instance.post(
          '/v1/image/upload',
          uploadFormData,
        );
        const result = response.data;

        if (result.success) {
          photos.push(result.url);
        } else {
          console.error('Upload failed:', result.message);
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    return photos;
  }

  let photoUrls = [];
  if (formData.getAll('file').length > 0) {
    photoUrls = await uploadImageToCloudinary(formData.getAll('file'));
  }

  let featureUrls = [];
  if (formData.get('featureFile')) {
    featureUrls = await uploadImageToCloudinary([formData.get('featureFile')]);
  }

  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;

    if (key === 'features') {
      const featuresObj = JSON.parse(value);
      if (featureUrls.length > 0) {
        featuresObj.image = featureUrls[0];
      }
      payload[key] = JSON.stringify(featuresObj);
    } else {
      payload[key] = value;
    }
  }

  if (photoUrls.length > 0) {
    payload.photos = JSON.stringify(photoUrls);
  }

  try {
    const res = await instance.post('/v1/listing/create', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.data?.success) {
      toast.success('product successfully listed.');
      localStorage.setItem('user', JSON.stringify(res.data?.userDetails));
      setIsAddProductModal(false);
      navigate('/ads');
    } else {
      console.error('Listing creation failed:', res.data.message);
    }
  } catch (err) {
    console.error('Listing failed:', err);
  }
  toast.dismiss(toastId);
}

export async function updateListing(formData, navigate, setIsAddProductModal) {
  const toastId = toast.loading('listing update in progress');

  async function uploadImageToCloudinary(imageFiles) {
    const photos = [];
    const validFiles = imageFiles.filter(
      (file) => file instanceof File && file !== undefined,
    );

    for (const file of validFiles) {
      console.log('Uploading file:', file.name, file.size);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      try {
        const response = await instance.post(
          '/v1/image/upload',
          uploadFormData,
        );
        const result = response.data;

        if (result.success && result.url) {
          photos.push(result.url);
        } else {
          console.error('Upload failed:', result.message || 'No URL returned');
        }
      } catch (err) {
        console.error('Upload error:', err.message || err);
      }
    }

    return photos;
  }

  //upload images to cloudinary
  let photoUrls = [];
  if (formData.getAll('file').length > 0) {
    photoUrls = await uploadImageToCloudinary(formData.getAll('file'));
  }

  // upload features photo if any
  let featureUrls = [];
  if (formData.get('featureFile')) {
    featureUrls = await uploadImageToCloudinary([formData.get('featureFile')]);
  }

  const payload = {};

  for (const [key, value] of formData.entries()) {
    if (value === undefined || value === null || value instanceof File) {
      continue;
    }

    if (key === 'features') {
      try {
        const featuresObj = JSON.parse(value);

        if (featureUrls?.length > 0) {
          featuresObj.image = featureUrls[0];
        }

        payload[key] = JSON.stringify(featuresObj);
      } catch (err) {
        console.warn(`Failed to parse features JSON:`, value);
        payload[key] = '{}';
      }
    } else {
      payload[key] = value;
    }
  }

  // Handle photoUrls if available
  if (photoUrls?.length > 0) {
    payload.photos = JSON.stringify(photoUrls);
  }

  try {
    const res = await instance.put('/v1/listing/update', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.data?.success) {
      toast.success('product successfully updated.');
      // localStorage.setItem('user', JSON.stringify(res.data?.userDetails));
      setIsAddProductModal(false);
      navigate('/ads');
    } else {
      console.error('Listing updation failed:', res.data.message);
    }
  } catch (err) {
    console.error('update failed:', err);
  }

  toast.dismiss(toastId);
}
