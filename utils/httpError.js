export default (status, message) => Object.assign(new Error(message), { status });
