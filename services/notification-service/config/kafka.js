const { KafkaProducer } = require('../../shared/kafka');

let producer = null;

async function getProducer() {
  if (!producer) {
    producer = new KafkaProducer({
      clientId: 'notification-service',
    });
    await producer.connect();
  }
  return producer;
}

async function publishNotificationEvent(event) {
  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send('notification.send', event);
    console.log(`✓ Published notification event: ${event.notificationId}`);
  } catch (error) {
    console.error('Failed to publish notification event:', error);
    throw error;
  }
}

async function publishEmailEvent(event) {
  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send('notification.email', event);
    console.log(`✓ Published email event: ${event.notificationId}`);
  } catch (error) {
    console.error('Failed to publish email event:', error);
    throw error;
  }
}

async function publishSMSEvent(event) {
  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send('notification.sms', event);
    console.log(`✓ Published SMS event: ${event.notificationId}`);
  } catch (error) {
    console.error('Failed to publish SMS event:', error);
    throw error;
  }
}

async function publishPushEvent(event) {
  try {
    const kafkaProducer = await getProducer();
    await kafkaProducer.send('notification.push', event);
    console.log(`✓ Published push event: ${event.notificationId}`);
  } catch (error) {
    console.error('Failed to publish push event:', error);
    throw error;
  }
}

async function disconnect() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}

module.exports = {
  getProducer,
  publishNotificationEvent,
  publishEmailEvent,
  publishSMSEvent,
  publishPushEvent,
  disconnect
};
