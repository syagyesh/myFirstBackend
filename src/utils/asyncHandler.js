const asyncHandler = (requesHandler) => {
  return (req, res, next) => {
    Promise.resolve(requesHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};

export default asyncHandler;

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };
