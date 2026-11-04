import { httpStatus } from "../config/httpStatus.js";

export const careerError = {
  Resume_Required: {
    message: "Resume file is required. Please upload a PDF, DOC, or DOCX document.",
    status: httpStatus.BAD_REQUEST,
  },
  Invalid_Phone: {
    message: "Invalid mobile number. Please enter a valid 10-digit Indian phone number.",
    status: httpStatus.BAD_REQUEST,
  },
  Invalid_Email: {
    message: "Invalid email address format.",
    status: httpStatus.BAD_REQUEST,
  },
  Full_Name_Required: {
    message: "Full name is required (minimum 2 characters).",
    status: httpStatus.BAD_REQUEST,
  },
  College_Required: {
    message: "College / University name is required.",
    status: httpStatus.BAD_REQUEST,
  },
  Course_Required: {
    message: "Degree / Course name is required.",
    status: httpStatus.BAD_REQUEST,
  },
  Domain_Required: {
    message: "Please select an internship domain.",
    status: httpStatus.BAD_REQUEST,
  },
  Application_Not_Found: {
    message: "Internship application not found.",
    status: httpStatus.NOT_FOUND,
  },
  Trainee_Not_Found: {
    message: "Trainee record not found.",
    status: httpStatus.NOT_FOUND,
  },
  Trainee_Image_Required: {
    message: "Trainee student photograph is required.",
    status: httpStatus.BAD_REQUEST,
  },
  Trainee_Name_Required: {
    message: "Trainee student name is required.",
    status: httpStatus.BAD_REQUEST,
  },
  Trainee_University_Required: {
    message: "Trainee university / college is required.",
    status: httpStatus.BAD_REQUEST,
  },
  Trainee_Domain_Required: {
    message: "Trainee domain / specialization is required.",
    status: httpStatus.BAD_REQUEST,
  },
};
