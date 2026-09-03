import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import * as timelineService from "../../services/timeline/timeline.service";

export async function getTimeline(req: Request, res: Response) {
  const timeline = await timelineService.getTimeline(req.userId as string);
  return sendSuccess(res, timeline);
}
