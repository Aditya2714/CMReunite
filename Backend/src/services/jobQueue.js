const queue = [];
let processing = false;

const processQueue = async () => {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await job.task();
    } catch (error) {
      console.error(`Background job "${job.name}" failed:`, error.message);
    }
  }
  processing = false;
};

const enqueue = (name, task) => {
  queue.push({ name, task });
  setImmediate(processQueue);
};

const getQueueStatus = () => ({ pending: queue.length, processing });

module.exports = { enqueue, getQueueStatus };
