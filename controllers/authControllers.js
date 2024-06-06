const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Student = require("../index");
// const upload = multer({
//   storage: multer.memoryStorage(),
//   fileFilter: (req, file, cb) => cb(null, true),
// });

// exports.s = async (req, res, next) => {
//   console.log(dbase);
//   let students = await dbase
//     .collection("students")
//     .find()
//     .toArray((err, result) => {});
// };

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (student, statusCode, res) => {
  try {
    const token = signToken(student._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };
    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie("jwt", token, cookieOptions);
    res.setHeader("authorization", `Bearer ${token}`);
    // Remove password from output
    student.password = undefined;

    res.status(statusCode).json({
      status: "success",
      token,
      data: {
        student,
      },
    });
  } catch (err) {
    console.log(err.message);
  }
};

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log(Student);

  //   console.log(Student);

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if user exists && password is correct
  const student = await Student.find({ email }).select("+password");
  console.log(Student);
  //   const Student = await student.findOne({ email }).select("+password");

  if (
    !Student ||
    !(await Student.correctPassword(password, Student.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(student, 200, res);
});

exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  console.log("ezzzzzay");
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentstudent = await student.findById(decoded.id);
  if (!currentstudent) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentstudent.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }
  console.log("ezzzzzay");

  // GRANT ACCESS TO PROTECTED ROUTE
  req.student = currentstudent;
  next();
});

exports.getStudent = asyncHandler(async (req, res, next) => {
  const Student = await Model.findById(req.params.id);
  if (!Student) {
    return next(new AppError("No user found ", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      Student,
    },
  });
});
