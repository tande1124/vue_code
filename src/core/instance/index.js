import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";

// Vue构造函数
function Vue(options) {
  // Vue.protoype._init 方法, 该方法是在 initMixin中定义的
  this._init(options);
}

// 合并配置
initMixin(Vue);
// stateMinin 主要定义了$data,$props,$set,$delete,$watch，并且$data,$props是只读属性
stateMixin(Vue);
// 初始化事件中心
eventsMixin(Vue);
// 初始化生命周期，调用生命周期钩子函数
lifecycleMixin(Vue);
// 初始化渲染
renderMixin(Vue);

export default Vue;
