# VUE2.6 的代码解读

## 1. Vue2 的初始化过程

### /\*\*

    *   Vue的初始过程(new Vue(options)) 都做了什么
    *  1.处理 组件配置项
    *    初始化根组件进行了选项合并操作，将全局配置合并到根组件的局部配置上
    *    初始化每个子组件时做了一些性能优化，将组件配置对象的一些深层次属性放到vm.$options选项中，以提高代码的执行效率
    *  2. 初始化组件实例的关系属性，比如$parent、$children、$root、$refs等
    *  3. 处理自定义事件
    *  4. 调用beforeCreate钩子函数
    *  5. 初始化组件的inject配置项，得到ret[key] =val 形式的配置对象，然后对该配置对象进行浅层的响应式处理(只处理第一层数据),并代理每个key到vm实例上
    *  6. 数据响应式，处理props、methods、data、computed、watch等选项
    *  7. 解析组件配置项上的provide对象，将其挂载到vm._provided属性上
    *  8. 调用created钩子函数
    *  9. 如果发现配置项上有el选项,则自动调用$mount方法，也就是有了el选项，就不需要在手动调用$mount方法，反之，没提供el选项则必须调用$mount
    *  10.接下来则进入挂载阶段
    *
    * /