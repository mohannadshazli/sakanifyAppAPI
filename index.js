const mongoose = require("mongoose");
const dotenv = require("dotenv");
const express = require("express");
const app = express();
exports.app = app;
const port = process.env.PORT || 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const bcrypt = require("bcryptjs");
// const authController = require("./controllers/authControllers");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => cb(null, true),
});
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const { error } = require("console");
const { send } = require("process");

app.use(express.static(`${__dirname}/public`));

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`DB connection successful!`);
  });

const Model = mongoose.model(
  "Model",
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      //   validate: [validator.isEmail, "Please provide a valid email"],
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [
        function () {
          return this.role === "student";
        },
        "you should submit your gender",
      ],
    },
    nationalId: String,
    faculty: String,
    phone: {
      type: String,
      required: [
        function () {
          return this.role === "owner";
        },
        "you should submit your phonenumber",
      ],
    },
    photo: String,
    photoUrl: {
      type: String,
      default:
        "https://firebasestorage.googleapis.com/v0/b/sakanify-upload.appspot.com/o/default.jpg?alt=media&token=d8956b4a-5731-4e36-9f1b-aeedce3e587f",
    },

    role: {
      type: String,
      enum: ["student", "owner"],
      required: [true, "you must submit your role"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  "students"
);
const message = new mongoose.Schema({
  content: {
    type: String,
    required: [true, "you must send message"],
    trim: true,
  },
  sender: String,
  receiver: String,
  date: {
    type: Date,
    default: Date.now(),
  },
});
const chatSchema = new mongoose.Schema({
  user1: String,
  user2: String,
  messages: [message],
});
const chatModel = mongoose.model("chatModel", chatSchema);

const saveMessages = async (msg, sender, receiver) => {
  const chat = await chatModel.findOne({
    $or: [
      { $and: [({ user1: sender }, { user2: receiver })] },
      { $and: [({ user2: receiver }, { user1: sender })] },
    ],
  });
  const obj = {
    content: msg,
    sender,
    receiver,
  };
  chat.messages.push(obj);
  await chat.save();
};

io.on("connection", (socket) => {
  console.log("Connected");
  socket.on("msg_from_client", (msg, from, to) => {
    console.log("1");
    socket.to(to).emit("reciveMsg", { message: msg, num: 2 });
    saveMessages(msg, from, to);
    console.log("2");
  });
  socket.on("join", (data) => {
    socket.join(data);
    console.log(socket.rooms);
  });
});

server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

//BeginAuthControllers

const changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

const s = async (req, res, next) => {
  console.log(dbase);
  let students = await dbase
    .collection("students")
    .find()
    .toArray((err, result) => {});
};

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

const correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log();

  //   console.log(Student);

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if user exists && password is correct
  const student = await Model.findOne({ email }).select("+password");
  //   const Student = await student.findOne({ email }).select("+password");

  if (!student || !(await correctPassword(password, student.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(student, 200, res);
});

const protect = asyncHandler(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
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
  const currentstudent = await Model.findById(decoded.id);
  if (!currentstudent) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.student = currentstudent;
  console.log("yfjhk");
  next();
});

const getStudent = asyncHandler(async (req, res, next) => {
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
const createChat = asyncHandler(async (req, res, next) => {
  const user = await Model.findOne({ email: req.body.email });
  if (!user) {
    throw new Error("There's no user with this email");
  }
  const currentChat = await chatModel.findOne({
    $or: [
      { $and: [({ user1: req.student.email }, { user2: req.student.email })] },
      { $and: [({ user2: req.student.email }, { user1: req.student.email })] },
    ],
  });

  if (currentChat) {
    console.log("Chat is already existed");
    res.status(201).json({
      data: currentChat,
    });
  } else {
    const chat = await chatModel.create({
      user1: req.student.email,
      user2: req.body.email,
    });
    res.status(201).json({
      data: chat,
    });
  }
});

const getMyChats = asyncHandler(async (req, res, next) => {
  // console.log("kk");
  const chats = await chatModel.find({
    $or: [{ user1: req.student.email }, { user2: req.student.email }],
  });
  res.status(201).json({
    status: "successful",
    data: chats,
  });
});

const getChat = asyncHandler(async (req, res, next) => {
  // console.log("kk");
  const chat = await chatModel.findById(req.params.id);
  res.status(201).json({
    status: "successful",
    data: chat,
  });
});

//EndAuthControllers

//BeginRoutes

app.route("/login").post(upload.none(), login);
app.route("/:id").get(getStudent);
app.route("/createChat").post(protect, upload.none(), createChat);
app.route("/getMyChats/k").get(protect, getMyChats);
app.route("/getChat/:id").get(protect, getChat);

//EndRoutes
