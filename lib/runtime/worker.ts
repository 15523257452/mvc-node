export enum Worker {
    AGENT = "AGENT",
    WORKER = "WORKER",
}

export function isAgent() {
    return process.env.NODE_WORK_TYPE === Worker.AGENT;
}

export enum WorkerStatus {
    START_SUCCESS,
    START_FAIL,
    ERROR,
    EXIT
}

export interface WorkerMessagePayload<T = any> {
    data: T;
    type: WorkerStatus
}

export function sendMessage(type: WorkerStatus, data = null) {
    process.send({ data, type });
}
