module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    app: 'FlowCheck API',
    version: '1.0.0',
    env: process.env.PLAID_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  });
};
