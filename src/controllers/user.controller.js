import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from req.body
  // validation
  // check if user exists
  // check for images, check for avatars
  // upload them to cloudinary
  // creae user object - create entry in db
  // remove password and refresh tocken from response
  // check for user creation
  // return response

  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists.");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(500, "Error in uploading avatar.");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Error in creating user.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created."));
});

const loginUser = asyncHandler(async (req, res) => {
  // get user details from req.body
  // validation
  // check if user exists
  // check if password is correct
  // generate access and refresh token
  // save refresh token in db
  // return response in cookies

  const { username, password, email } = req.body;

  if ([username || email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user);

  // const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  const loggedInUser = user.select("-password");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Login successful."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logout successful."));
  // // remove refresh token from db
  // // clear cookies
  // // return response

  // const { refreshToken } = req.cookies;

  // if (!refreshToken) {
  //   throw new ApiError(400, "Invalid request.");
  // }

  // const user = await User.findOne({ refreshToken });

  // if (!user) {
  //   throw new ApiError(404, "User not found.");
  // }

  // user.refreshToken = null;
  // await user.save();

  // return res.status(200)
  //   .clearCookie("accessToken")
  //   .clearCookie("refreshToken")
  //   .json(new ApiResponse(200, null, "Logout successful."));
});

export { registerUser, loginUser, logoutUser };
