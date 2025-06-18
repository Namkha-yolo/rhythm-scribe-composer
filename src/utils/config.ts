
// Environment configuration for AWS Bedrock integration
export const config = {
  aws: {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
  },
  bedrock: {
    models: {
      claude: 'anthropic.claude-3-sonnet-20240229-v1:0',
      titan: 'amazon.titan-text-express-v1',
      audioGeneration: 'stability.stable-audio-open-1:0'
    }
  }
};

// Check if AWS credentials are configured
export const isAWSConfigured = (): boolean => {
  return !!(config.aws.accessKeyId && config.aws.secretAccessKey);
};

// Display configuration status
export const getConfigStatus = () => {
  return {
    awsConfigured: isAWSConfigured(),
    region: config.aws.region,
    modelsAvailable: Object.keys(config.bedrock.models).length
  };
};
