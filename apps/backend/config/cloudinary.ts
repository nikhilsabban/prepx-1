import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfq6px5xz",
  api_key: process.env.CLOUDINARY_API_KEY || "159987823528767",
  api_secret: process.env.CLOUDINARY_API_SECRET || "d3fH6B8S5c9zN7X1_P1k8V2wL4m",
});


export default cloudinary;
