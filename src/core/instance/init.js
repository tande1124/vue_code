// Vue 的初始化过程 (new Vue(options)) 都做了什么？
// 处理组件配置项
//    1. 初始化根组件进行了选项合并操作，将全局配置合并到跟逐渐的局部配置上
//    2. 初始化每个子组件 做了一些性能优化，将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
// 初始化组件实例的关系属性,比如 parent、children、root、 refs等
// 处理自定义事件
// 调用 beforeCreate 钩子函数
// 初始化组件的inject配置项，得到result[key] = val 形式的配置对象，然后对结果数据进行浅层的响应式处理，并处理每个key到vm实例
// 数据响应式，处理props、merthods、data、computed、watch 等选项
// 解析组件配置上的provide 对象，将其挂载到vm._provided属性上
// 调用 created 钩子函数
// 如果发现配置上有el选项，则自动调用 mounted 方法，也就是说有了el选项，就不需要在再手动调用 mouted 方法
// 接下来则进入挂载阶段

import { initProxy } from "./proxy";
import { initState } from "./state";
import { initRender } from "./render";
import { initEvents } from "./events";
import { initLifecycle, callHook } from "./lifecycle";
import { initProvide, initInjections } from "./inject";
import { extend, mergeOptions, formatComponentName } from "../util/index";

let uid = 0;

/**
 *  定义 Vue.prototype._init 方法
 * @param {*} Vue 构造函数
 */
export function initMixin(Vue: Class<Component>) {
  /**
   * 给vue的原型上挂载一个 _init方法
   * 负责 Vue 的初始化过程
   */
  Vue.prototype._init = function (options?: Object) {
    //-------------------------------- 第一部分-----------------------------//

    // 获取vue 实例
    const vm: Component = this;
    // 每个 Vue 实例都有一个 _uid,并且是依次递增的
    vm._uid = uid++;
    // vue实例不应该是一个人响应式的，做个标记
    vm._isVue = true;

    //------------------------------------- 第二部分--------------------------------//

    /**
     * 处理组件配置项
     * 对options进行合并，vue会将相关的属性和方法都统一放到vm.$options中，为后续的调用做准备工作
     * vm.$option的属性来自两个方面，一个是Vue的构造函数(vm.constructor)预先定义的，一个是new Vue时传入的入参对象
     */
    if (options && options._isComponent) {
      // 子组件：性能优化 减少原型链的动态查找，提高执行效率
      /**
       * 每个子组件初始化时走这里，这里只做了一些性能优化·
       * 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
       */
      initInternalComponent(vm, options);
    } else {
      /**
       * 合并配置项
       * 初始化根组件走这里，合并vue 的全局配置到根组件的局部配置，比如 Vue.component 注册的全局组件会合并到根实例的 components选项中
       *
       * 至于每个子组件的选项合并则发生在两个地方
       * 1、 Vue.components(compNamem, comp) 方法注册的全局组件在注册时做了选项合并  合并内置的全局组件和用户自己的注册的全局组件，最终都会放到 全局的 components 选项中
       * 2、{components: {xx}}  局部组件 方法注册的局部组件在执行编译器生成的render 函数时做了选项合并，包括根组件中饭的components配置
       * 3、 这里根据根组件的情况了
       */
      vm.$options = mergeOptions(
        // 这里是取到之前的默认配置，组件 指令 过滤器等 也就是构造函数的options
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }

    //-----------------------------------------第三部分----------------------------------//
    // 在非生产环境下执行了initProxy函数,参数是实例;在生产环境下设置了实例的_renderProxy 属性为实例自身
    if (process.env.NODE_ENV !== "production") {
      initProxy(vm);
    } else {
      vm._renderProxy = vm;
    }

    // 设置了实例的_self属性为实例自身
    vm._self = vm;

    /**   重点 整个初始化最重要的部分，也是核心 */

    // 初始化组件会理关系属性，比如：$parents、$children、$root、$refs等
    initLifecycle(vm);

    /**
     * 初始化自定义事件，这里需要注意一点，所以在<comp @click="handClick"/> 上注册的事件，监听者不是父组件
     * 而是子组件本身，也就是说事件的派发和监听者都是子组件本身，和父组件无法
     * this.$emit('click')   this.$on('click')
     */
    initEvents(vm);

    // 解析组件的插槽信息，得到vm.$slots,处理渲染函数，得到vm.$createElement方法，即h函数
    initRender(vm);

    // 调用 beforeCreate 钩子函数
    callHook(vm, "beforeCreate");

    // 初始化组件的inject配置项，得到result[key] = val 形式的配置对象，然后对结果数据进行响应式处理，并处理每个key到vm实例
    // 通过provide/inject可以轻松实现跨级访问祖先组件的数据
    initInjections(vm);

    // 数据响应式的重点，处理props、methods、data、computed、watch
    initState(vm);

    // 解析组件配置项上的provide对象，将其挂载到vm._provided属性上
    initProvide(vm);

    // 调用 created钩子函数
    callHook(vm, "created");

    // ------------------------------------------------第四部分----------------------------//

    // 如果发现配置项上有 el 选项，则自动调用 $mount 方法，也就是说有了 el 选项，就不需要再手动调用 $mount，反之，没有 el 则必须手动调用 $mount
    if (vm.$options.el) {
      // 调用 $mount 方法，进入挂载阶段
      vm.$mount(vm.$options.el);
    }
  };
}

/**
 * 性能优化，把组件传进来的一些配置赋值到vm.$options上 打平配置对象中上的属性，减少运行时原型链的查找，提高执行效率
 * @param {*} vm  组件实例
 * @param {*} options  传递进来的配置
 */
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  // 基于 组件构造函数 上的配置对象 创建vm.$options
  const opts = (vm.$options = Object.create(vm.constructor.options));

  // 把组件传进来的一些配置赋值到vm.$options上
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  // 有 render 函数，将其赋值到vm.$options
  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

/**
 * 从组件构造函数中的解析配置对象options，并合并基类选项
 * @param {*} Ctor
 * @returns
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
  // 配置项目
  let options = Ctor.options;
  if (Ctor.super) {
    // 存于基类，递归解析基类构造函数的选项
    const superOptions = resolveConstructorOptions(Ctor.super);
    // 缓存
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // 说明基类构造函数选项已经发生改变，需要重新设置
      Ctor.superOptions = superOptions;
      // 检查 Ctor.options 上是否有任何后期修改/附加的选项
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // 如果存在被修改或增加的选项，则合并两个选项
      if (modifiedOptions) {
        // 将更改的选项 和 extend 选项合并
        extend(Ctor.extendOptions, modifiedOptions);
      }

      // 选项合并，将新的选项合并结果赋值为Ctor.options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

/**
 * 解析构造函数选项中后续被修改或者增加的选项
 * @param {*} Ctor
 * @returns
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  // 构造函数选项
  const latest = Ctor.options;
  // 密封的构造函数选项，备份
  const sealed = Ctor.sealedOptions;
  // 对比两个选项，记录不一样的选项
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
