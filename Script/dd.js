const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const slugify = require("slugify");
const dotenv = require("dotenv");
// const validator = require('validator');

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

const postSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A post must have a name"],
      trim: true,
      minlength: [10, "A post name must have more or equal then 10 characters"],
      // validate: [validator.isAlpha, 'post name must only contain characters']
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    slug: String,
    userId: String,
    address: {
      type: String,
      trim: true,
      required: [true, "post should have an address"],
    },
    city: {
      type: String,
      trim: true,
      required: [true, "post should have an city"],
    },
    addressUp: {
      type: String,
      trim: true,
      required: [true, "post should have an address"],
    },
    street: {
      type: String,
      trim: true,
      required: [true, "post should have an street"],
    },
    floorNum: {
      type: String,
      trim: true,
      required: [true, "post should have an floor number"],
    },
    services: [String],
    postType: {
      type: String,
      enum: ["apartment", "room", "mixedRoom"],
    },
    postGender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "you should submit gender"],
    },
    cleanOverall: {
      type: Number,
      default: 1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    userImage: String,
    cleanQuantity: {
      type: Number,
      default: 0,
    },
    communicationOverall: {
      type: Number,
      default: 1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    communicationQuantity: {
      type: Number,
      default: 0,
    },
    locationOverall: {
      type: Number,
      default: 1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    locationQuantity: {
      type: Number,
      default: 0,
    },
    valueOverall: {
      type: Number,
      default: 1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    valueQuantity: {
      type: Number,
      default: 0,
    },
    ratingsAverage: {
      type: Number,
      default: 1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    bedrooms: {
      type: Number,
      required: [true, "you should submit number of bedrooms"],
    },
    beds: {
      type: Number,
      required: [true, "you should submit number of beds"],
    },
    bathrooms: {
      type: Number,
      required: [true, "you should submit number of bathrooms"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A post must have a price"],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "A post must have a description"],
    },
    imageCover: {
      type: String,
      required: [true, "A post must have a cover image"],
    },
    imageCoverUrl: String,
    images: [String],
    imagesUrl: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Post = mongoose.model("Post", postSchema);

const message = new mongoose.Schema({
  content: {
    type: String,
    required: [true, "you must send message"],
    trim: true,
  },
  sender: String,
  receiver: String,
  isMy: Boolean,
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

const deleteData = async (x) => {
  try {
    await x.deleteMany();
    console.log("Done");
  } catch (err) {
    console.log(err.message);
  }
};

deleteData(chatModel);
