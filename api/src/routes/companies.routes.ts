import { Router } from "express";
import * as companyController from "../controllers/companies/company.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", companyController.createCompany);
router.get("/", companyController.getCompanies);
router.get("/:id", companyController.getCompany);
router.patch("/:id", companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

export default router;
