import { escape } from 'querystring';
import ListModel from '../models/Listing.js';
import { userModel } from '../models/user.model.js';
import { formatDate } from '../utils/formatDate.js';
import { getCoordinates } from '../utils/getLatitudeAndLongitude.js';

export const getAllListing = async (req, res) => {
  try {
    const response = await ListModel.find().populate('user');

    return res.status(200).json({ message: 'Total Listing', response });
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      message: 'Error in fetching all listrings',
      errror: error.message,
    });
  }
};

export const getUserListing = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(404).json({
        message: 'User not authenticated',
      });
    }
    const user = await ListModel.find({ user: userId })
      .populate('category')
      .populate('user');


    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      message: 'Error in fetching listings',
      error: error.message,
    });
  }
};

export const getListingResponse = async (req, res) => {
  try {
    const user = req.user;

    console.log(user._id);

    const allListing = await ListModel.find({ user: user._id })
      .populate('response')
      .populate('reported');

    if (!allListing) {
      return res.status(404).json({
        message: 'No listing found',
      });
    }

    return res.status(200).json(allListing);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Listing Reponse error',
      error: error.message,
    });
  }
};

export const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      brand,
      price,
      state,
      city,
      neighbourhood,
      features,
      category,
      subCategory,
      photos,
    } = req.body;

    let user = req.user;

    const parsedImages =
      typeof photos === 'string' ? JSON.parse(photos) : photos;
    console.log(parsedImages);

    const coordinates = await getCoordinates(city, state);

    const location = {
      city,
      state,
      neighbourhood,
      coordinates: coordinates.error ? [0, 0] : coordinates,
    };

    const parsedFeatures =
      typeof features === 'string' ? JSON.parse(features) : features;

    const userPayload = {
      name: user.fullName,
      memberSince: formatDate(user.createdAt),
    };

    const expiryDate = formatDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    const newProductListing = ListModel({
      title,
      description: description || '',
      user: user._id,
      category: category,
      subcategory: subCategory,
      brand,
      price: price ? price.replace(/,/g, '') : '',
      images: parsedImages,
      state,
      city,
      features: parsedFeatures,
      location,
      postedBy: userPayload,
      isExpired: false,
      expiryDate: expiryDate,
    });

    await newProductListing.save();

    const userDetails = await userModel.findByIdAndUpdate(user._id, {
      $push: {
        productListed: newProductListing._id,
      },
    });

    user = await userModel.findById(user._id);
    console.log(user);
    return res.status(201).json({
      success: true,
      freeLimit: true,
      message: 'Product listed successfully',
      data: newProductListing,
      userDetails,
    });
  } catch (error) {
    console.error('Create Listing Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateViews = async (req, res) => {
  try {
    const userId = req.user._id;
    const listingId = req.params.id;

    const listing = await ListModel.findByIdAndUpdate(listingId, {
      $push: {
        views: {
          userId,
        },
      },
    });

    if (!listing) {
      return res.status(404).json({
        message: 'Listing not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Listing views updated',
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const updateListing = async (req, res) => {
  try {
    const {
      title,
      description,
      brand,
      price,
      state,
      city,
      neighbourhood,
      features,
      category,
      subCategory,
      photos,
      listingId,
    } = req.body;

    if (!listingId) {
      return res.status(404).json({
        message: 'Listing not found.',
      });
    }

    const listing = await ListModel.findById(listingId);
    const parsedImages =
      typeof photos === 'string' ? JSON.parse(photos) : photos;
    console.log(parsedImages);

    const coordinates = await getCoordinates(city, state);

    const location = {
      city,
      state,
      neighbourhood,
      coordinates: coordinates.error ? [0, 0] : coordinates,
    };

    const parsedFeatures =
      typeof features === 'string' ? JSON.parse(features) : features;

    const updatePayload = {
      title,
      description: description || '',
      category,
      subcategory: subCategory,
      brand,
      price: price ? price.replace(/,/g, '') : '',
      state,
      city,
      features: parsedFeatures,
      location,
      isExpired: listing.expiryDate < Date.now(),
    };

    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
      updatePayload.$push = {
        images: { $each: parsedImages },
      };
    }

    // Perform the update
    const updatedListing = await ListModel.findByIdAndUpdate(
      listingId,
      updatePayload,
      { new: true },
    ).populate('user');

    if (!updatedListing) {
      return res.status(404).json({
        message: 'Listing not updated',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Listing updated',
      updatedListing,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Server errror',
      error: error.message,
    });
  }
};
