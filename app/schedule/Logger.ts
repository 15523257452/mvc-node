import {Autowrite, Schedule, ScheduleHandler, ScheduleJob} from "../../lib";
import BaseService from "../service/BaseService";

@Schedule("30 * * * * *")
export default class LoggerSchedule implements ScheduleHandler{

    @Autowrite()
    private base:BaseService;

    public job: ScheduleJob;

    public run(date: Date): void {
        console.log("定时任务被执行--->");
    }

}
