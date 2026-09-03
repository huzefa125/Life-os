import { Router } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", async (req, res) => {
    try{
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$connect();
        res.status(200).json({
            success: true, 
            message : "Database is healthy",
            timestamp : new Date().toISOString()
        });
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Database is not healthy",
            timestamp: new Date().toISOString()
        })
    }
})


export default router;