import "reflect-metadata";
import {ControllerOptions, MetaKey, MethodOptions} from "..";
import Container from "../core/container";
import {Logger} from "../index";
import {pathToRegexp} from "path-to-regexp";

const path = require("path");

type Constructor = { new (...args) }

/**
 * 解析装饰器到容器里
 */
export default class ParserDecorate {

    public static parser(map: Map<string, Function>) {
        const entries = map.entries();
        let next = entries.next();
        while (!next.done) {
            const fun = next.value[1];
            if (typeof fun === "function") {
                const controller = Reflect.hasMetadata(MetaKey.CONTROLLER, fun);
                const service = Reflect.hasMetadata(MetaKey.SERVICE, fun);
                const component = Reflect.hasMetadata(MetaKey.COMPONENT, fun);
                if (controller) {
                    this.parseController(fun);
                }
                if (service || component) {
                    this.parseService(fun);
                }
            }
            next = entries.next();
        }
    }

    /**
     * 服务注入
     */
    public static parserAutowrite() {
        Container.findAll((k, value) => {
            const target = value.instance;
            const fields = Reflect.ownKeys((target as any).__proto__);
            for (const name of fields) {
                if (
                    typeof target[name] !== "function" &&
                    Reflect.hasMetadata(MetaKey.INJECT, target, name as string)
                ) {
                    if (typeof name !== "string") return;
                    const type = Reflect.getMetadata("design:type", target, name);
                    let server = null;
                    if (type && type !== Object) {
                        server = Container.getByType(type);
                    } else {
                        server = Container.getByName(name);
                    }
                    if (!server) {
                        Logger.error(`inject fail: ${name}, not find server`);
                    } else {
                        target[name] = server;
                    }
                }
            }
        })
    }

    /**
     * 将Service注入容器
     */
    private static parseService(fun: Constructor) {
        Container.addService({
            instance: new fun(),
            func: fun,
        });
    }

    /**
     * 解析控制器的装饰器 添加到容器
     * @param fun
     */
    private static parseController(fun: Constructor) {
        const metadata = Reflect.getMetadata(MetaKey.CONTROLLER, fun) as ControllerOptions;
        const target = new fun();
        Reflect.ownKeys(target.__proto__).forEach(value => {
            if (
                typeof target[value] === "function"
                && Reflect.hasMetadata(MetaKey.METHOD, target[value])
            ) {
                const methodOpt = Reflect.getMetadata(MetaKey.METHOD, target[value]) as MethodOptions;
                const url = path.join(metadata.path, methodOpt.path).replace(/\\/g, "/");

                // 解析path参数key
                // params: {key: index} key: 参数名称 index: 参数的位置
                const params = {};
                const keys = [];
                const rules = pathToRegexp(url, keys);
                const maps =
                    url.replace('/', '')
                    .split('/')
                    .map((item) => item.replace(':', ''));
                keys.forEach((item) => {
                    if (item.name) {
                        params[item.name] = maps.indexOf(item.name);
                    }
                });
                Container.add(url, {
                    instance: target,
                    func: target[value],
                    method: methodOpt.method,
                    rules: rules,
                    params,
                });
            }
        });
    }
}