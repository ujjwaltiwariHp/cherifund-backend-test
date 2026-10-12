import express from "express";
import {
    addSponsor,
    deleteSponsor,
    getAllSponsors,
    getSponsorById,
    updateSponsor
} from "../../controllers/Admin/sponsor.js";
import uploadLocal, { multerUpload } from "../../middlewares/multer.js";
import { isAdmin } from "../../middlewares/isAdmin.js";
import { authentication } from "../../middlewares/auth.js";

const router = express.Router();

const sponsorUpload = multerUpload(
    uploadLocal.fields([
        { name: "logo", maxCount: 1 },
        { name: "image", maxCount: 1 }
    ])
);

router.post("/add-sponsor", authentication, isAdmin, sponsorUpload, addSponsor);
router.get("/getAllSponsors", authentication, isAdmin, getAllSponsors);
router.get("/getSponsorById/:id", authentication, isAdmin, getSponsorById);
router.get("/getSponsorById/:sponsorId", authentication, isAdmin, getSponsorById);
router.put("/update-sponsor/:id", authentication, isAdmin, sponsorUpload, updateSponsor);
router.put("/update-sponsor/:sponsorId", authentication, isAdmin, sponsorUpload, updateSponsor);
router.delete("/delete-sponsor/:id", authentication, isAdmin, deleteSponsor);
router.delete("/delete-sponsor/:sponsorId", authentication, isAdmin, deleteSponsor);

export default router;
