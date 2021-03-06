import {MetaKey, RequestMethod} from "./decorate";

// 可被注入的组件服务
interface Component {
    instance: Object;
    func: Function;
}

// 控制器
interface Controller extends Component {
    method?: RequestMethod;
    rules?: RegExp | undefined;
    params?: object | undefined;
}

// Interceptor
interface Handler extends Component {
    rules: RegExp | null;
    type: HandlerType;
}

type HandlerType = MetaKey.INTERCEPTOR_HANDLER | MetaKey.ERROR_HANDLER;

/**
 * IOC 容器的储存结构
 */
class ContainerMap {

    // 路由映射容器
    public controller: Map<string, Controller> = new Map<string, Controller>();

    // 可被注入的组件
    public component: Set<Component> = new Set<Component>();

    // 处理器 例如：请求/响应拦截器 全局异常处理器
    public handler: Set<Handler> = new Set<Handler>();

    // 获取所有value
    public getAllValues() {
        const values = [...Array.from(this.component), ...Array.from(this.handler)];
        const con = this.controller.values();
        let next = con.next();
        while (!next.done) {
            values.push(next.value);
            next = con.next();
        }
        return values;
    }
}

/**
 * 容器
 */
class Container {
    private readonly container: ContainerMap = new ContainerMap();

    // 添加controller key ==> method:url
    public add (k: string, v: Controller) {
        this.container.controller.set(k, v);
    }

    // 获取controller
    public get (k: string, method: RequestMethod): Controller {
        const value = this.container.controller.get(`${method}:${k}`);
        if (value && value.method === method) {
            return value;
        }

        const entries = this.container.controller.entries();
        let next = entries.next();
        while (!next.done) {
            const value  = next.value[1] as Controller;
            if (value && value.method === method) {
                if (value.rules && value.rules.test(k)) {
                    return value;
                }
            }
            next = entries.next();
        }
        return null;
    }

    // 遍历service controller
    public findAll(call: (key: string, value: Component) => boolean | void) {
        const entries = this.container.getAllValues().entries();
        let next = entries.next();
        while (!next.done) {
            const state = call(next.value[0], next.value[1]);
            if (!state) {
                next = entries.next();
            } else {
                break;
            }
        }
    }

    // 添加service
    public addService(com: Component) {
        this.container.component.add(com);
    }

    // 获取service
    public getByType(server: Function) {
        const entries = this.container.component.entries();
        let next = entries.next();
        while (!next.done) {
            const value = next.value[1] as Component;
            if (value.instance instanceof server) {
                return value.instance;
            }
            next = entries.next();
        }
        return null;
    }

    // 获取service
    public getByName(name: string) {
        let res = null;
        this.findAll((k, value) => {
            if (value.instance.constructor.name === name) {
                res = value.instance;
                return true;
            }
        });
        return res;
    }

    // 获取拦截器
    public getInterceptor(path: string): Handler[] {
        const res = [];
        const handler = Array.from(this.container.handler);
        const handlers = handler.filter(item => item.type === MetaKey.INTERCEPTOR_HANDLER);
        for (const interceptor of handlers) {
            if (!interceptor.rules || interceptor.rules.test(path)) {
                res.push(interceptor);
            }
        }
        return res;
    }

    // 获取全局异常拦截器
    public getErrorHandler() {
        const handler = Array.from(this.container.handler);
        return handler.filter(item => item.type === MetaKey.ERROR_HANDLER);
    }

    // 添加handler
    public addInterceptor(inter: Handler): void {
        this.container.handler.add(inter);
    }
}

/**
 * 只暴露操作容器的方法，不直接对外暴露container属性
 */
function getContainer() {
    const box = new Container();
    const keys = Object.keys((box as any).__proto__);
    const res = {};

    keys.forEach(k => res[k] = box[k].bind(box));
    return res;
}

export default getContainer() as Container;
