import {
  UnifiedPaymentNotification,
  HookHandler,
  HookEvent,
} from '../types/payment';

/**
 * Hook 管理器
 */
export class HookManager {
  private hooks: Map<HookEvent, HookHandler[]> = new Map();

  /**
   * 注册 Hook
   * @param event 事件名称
   * @param handler 处理函数
   */
  on(event: HookEvent, handler: HookHandler): void {
    const handlers = this.hooks.get(event) || [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
  }

  /**
   * 注销 Hook
   * @param event 事件名称
   * @param handler 处理函数
   */
  off(event: HookEvent, handler: HookHandler): void {
    const handlers = this.hooks.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.hooks.set(event, handlers);
    }
  }

  /**
   * 触发 Hook
   * @param event 事件名称
   * @param notification 支付通知
   */
  async emit(
    event: HookEvent,
    notification: UnifiedPaymentNotification
  ): Promise<void> {
    const handlers = this.hooks.get(event) || [];

    // 并行执行所有处理函数
    const promises = handlers.map(handler => {
      try {
        return Promise.resolve(handler(notification));
      } catch (error) {
        console.error(`Hook ${event} 执行失败:`, error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 清除所有 Hook
   */
  clear(): void {
    this.hooks.clear();
  }

  /**
   * 获取指定事件的 Hook 数量
   * @param event 事件名称
   * @returns Hook 数量
   */
  getHookCount(event: HookEvent): number {
    return this.hooks.get(event)?.length || 0;
  }

  /**
   * 获取所有已注册的事件
   * @returns 事件列表
   */
  getRegisteredEvents(): HookEvent[] {
    return Array.from(this.hooks.keys());
  }
}

/**
 * 根据支付状态触发相应的 Hook
 * @param notification 支付通知
 * @param hookManager Hook 管理器
 */
export async function callStatusHooks(
  notification: UnifiedPaymentNotification,
  hookManager: HookManager
): Promise<void> {
  // 先触发通用的 onNotify Hook
  await hookManager.emit('onNotify', notification);

  // 再根据状态触发对应的 Hook
  switch (notification.tradeStatus) {
    case 'SUCCESS':
      await hookManager.emit('onSuccess', notification);
      break;
    case 'FAIL':
      await hookManager.emit('onFail', notification);
      break;
    case 'PENDING':
      await hookManager.emit('onPending', notification);
      break;
  }
}
