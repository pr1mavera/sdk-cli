import whatsElement from 'whats-element/src/whatsElementPure';
import { Service } from '../jssdk/service';

export const _ = <Utils>function () { }

_.unboundMethod = function (methodName: string, argCount: number = 2) {
    return this.curry(
        (...args: any[]) => {
            const obj = args.pop();
            return obj[methodName](...args);
        },
        argCount
    );
}

_.curry = (fn: Fn, arity: number = fn.length) => {
    // 1. 构造一个这样的函数：
    //    即：接收前一部分参数，返回一个 接收后一部分参数 的函数，返回的那个函数需在内部判断是否执行原函数
    const nextCurried = (...prev: any[]) =>
        (...next: any[]) => {
            const args = [...prev, ...next];

            return args.length >= arity
                ? fn(...args)
                : nextCurried(...args)
        };

    // 2. 将构造的这个函数执行并返回，初始入参为空
    return nextCurried();
};

_.map = _.unboundMethod('map', 2);

const { sessionStorage, localStorage } = <Window>window;
const [SessStorage, LocStorage] = _.map(
    (storage: Storage) => ({
        get: key => JSON.parse(storage.getItem(key)),
        set: (key, val) => storage.setItem(key, JSON.stringify(val)),
        remove: key => storage.removeItem(key),
        clear: () => storage.clear()
    } as CustomStorage)
)([sessionStorage, localStorage]);
_.SessStorage = SessStorage;
_.LocStorage = LocStorage;

_.windowData = {
    get(key) {
        // 格式化 window.name，保证 window.name 一定是JSON字符串
        !window.name && (window.name = JSON.stringify({}));

        // 获取安全的 window.name 数据
        let safeData = undefined;
        try {
            safeData = JSON.parse(window.name);
        } catch (error) {
            safeData = {};
        }

        // 若传入了 key ，表示需要获取某个字段的值: any ，若不传表示获取完整的 window.name: Object
        return key ? (safeData[key] ? safeData[key] : '') : safeData;
    },
    set(key, val) {
        // window.name = JSON.stringify(val);
        const wData = this.get() || {};
        window.name = JSON.stringify({ ...wData, [key]: val });
    }
};

_.inIframe = () => window && window.self !== window.top;

_.isType = (type, staff) => Object.prototype.toString.call(staff) === `[object ${type}]`;

_.firstUpperCase = str => str.toLowerCase().replace(/( |^)[a-z]/g, (s: string) => s.toUpperCase());

_.splitQuery = str => {
    if (!str) return {};
    const querystrList = str.split('&');
    return querystrList.map((querystr: string) => querystr.split('='))
                        .reduce((temp: Obj, queryItem: Array<string>) => ({
                            ...temp, [queryItem[0]]: queryItem[1]
                        }), {});
};

_.createVisitId = function (appId) {
    return ''
        // 应用id
        + appId
        // 当前访问时间（到秒）
        + this.formatDate('yyyy-MM-dd-hh-mm-ss').split(/-/g).join('')
        // 6位随机数
        + this.randomInRange(100000, 999999);
};

_.formatDate = (format, date = new Date()) => {
    const map: {
        [key: string]: number | string;
    } = {
        'M': date.getMonth() + 1, // 月份
        'd': date.getDate(), // 日
        'h': date.getHours(), // 小时
        'm': date.getMinutes(), // 分
        's': date.getSeconds(), // 秒
        'q': Math.floor((date.getMonth() + 3) / 3) // 季度
    };
    format = format.replace(/([yMdhmsqS])+/g, <(substring: string, ...args: any[]) => string>function (all: string, t: any) {
        var v = map[t];
        if (v !== void 0) {
            if (all.length > 1) {
                v = '0' + v;
                v = v.substr(v.length - 2);
            }
            return v;
        } else if (t === 'y') {
            return (date.getFullYear() + '').substr(4 - all.length);
        } else if (t === 'S') {
            const ms = `00${date.getMilliseconds()}`;
            return ms.substr(ms.length - 3);
        }
        return all;
    });
    return format;
};

_.randomInRange = (min, max) => Math.floor(Math.random() * (max - min) + min);

_.getElemPid = function (sysId, pageId, e) {
    try {
        const { type, wid } = new whatsElement().getUniqueId(e);
        // const { type, wid } = { type: 'type', wid: 'wid' };
        return `${wid}!${type}!${sysId}!${pageId}`;
    } catch {
        return null;
    }
};

_.getElemByPid = pid => {
    const [ id, , , pageId ] = pid.split('!');
    if (pageId !== location.pathname) return null;
    return document.getElementById(id) || document.getElementsByName(id)[0] || document.querySelector(id);
};

_.getElemClientRect = e => {
    const { left, top, width, height } = e.getBoundingClientRect();
    // [ x, y, w, h ]
    return [ Math.round(left), Math.round(top), Math.round(width), Math.round(height) ];
}

_.errorCaptured = async (asyncFn, formatter, ...rest) => {
    try {
        const { result: { code, message }, data } = await asyncFn(...rest);
        if (code === Service.ERR_OK) {
            return [ null, formatter ? formatter(data) : data ];
        } else {
            return [ message, data ];
        }
    } catch (ex) {
        return [ ex, null ];
    }
};

_.deviceInfo = () => {
    const u = navigator.userAgent;
    const ua = u.toLowerCase();
    let name: string;
    let version: number;
    let browser: string = 'wx';
    let connType: string = /nettype/.test(ua) ? ua.match(/NetType\/(\S*)/)[1] : 'unknown';

    if (u.indexOf('Android') > -1 || u.indexOf('Linux') > -1) {
        // Android
        const reg = /android [\d._]+/gi;
        name = 'Android';
        version = parseFloat((ua.match(reg) + '').replace(/[^0-9|_.]/ig, '').replace(/_/ig, '.'));
    } else if (u.indexOf('iPhone') > -1) {
        // iPhone
        const ver = ua.match(/cpu iphone os (.*?) like mac os/);
        name = 'iPhone';
        version = parseFloat(ver[1].replace(/_/g, '.'));
        // 微信内置浏览器否
        browser = (ua.match(/MicroMessenger/i) && ua.match(/MicroMessenger/i)[0] == 'micromessenger') ? 'wx' : 'safari';
    } else if (u.indexOf('Windows Phone') > -1) {
        name = 'windowsPhone';
        version = -1;
    }
    return {
        name,
        version,
        browser,
        connType
    };
};

_.reloadConstructor = function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class ReloadConstructor extends constructor {
        // console.log('装饰重载');
    }
}
