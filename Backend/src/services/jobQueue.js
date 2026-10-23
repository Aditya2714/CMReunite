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
      require("../utils/operationalLog").failure(`background.${job.name}.failed`, error);
    }
  }
  processing = false;
};

const enqueue = (name, task) => {
  queue.push({ name, task });
  setImmediate(processQueue);
};

const getQueueStatus = () => ({ pending: queue.length, processing });

const drain = async (timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while ((queue.length || processing) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  return !queue.length && !processing;
};
module.exports = { enqueue, getQueueStatus, drain };
