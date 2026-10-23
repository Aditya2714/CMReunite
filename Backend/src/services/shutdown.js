const { failure } = require('../utils/operationalLog');
module.exports = ({ server, io, mongoose, placement, queue, timeoutMs = 30000 }) => {
  let stopping = false;
  return async () => {
    if (stopping) return; stopping = true;
    placement.stopPlacementNotificationWorker();
    const deadline = setTimeout(() => {
      failure('shutdown.deadline', { code: 'UNFINISHED_BEST_EFFORT_WORK' });
      server.closeAllConnections(); process.exit(1);
    }, timeoutMs); deadline.unref();
    try {
      await new Promise(resolve => { io.disconnectSockets(true); server.close(resolve); server.closeIdleConnections(); });
      await new Promise(resolve => io.close(resolve));
      const drained = await queue.drain(Math.max(1, timeoutMs - 1000));
      if (!drained) failure('shutdown.queue_unfinished', { code: 'BEST_EFFORT_WORK_LOST' });
      await placement.drain(Math.max(1, timeoutMs - 1000));
      await mongoose.disconnect(); clearTimeout(deadline);
      console.log(JSON.stringify({ level:'info', event:'shutdown.complete', drained }));
      process.exit(drained ? 0 : 1);
    } catch (error) { failure('shutdown.failed', error); process.exit(1); }
  };
};
