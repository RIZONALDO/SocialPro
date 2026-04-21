import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teamMembersRouter from "./team-members";
import videosRouter from "./videos";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(teamMembersRouter);
router.use(videosRouter);
router.use(reportsRouter);

export default router;
