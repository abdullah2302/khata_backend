export const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'CastError') { status = 400; message = 'Invalid id or value'; }
  if (err.code === 11000) { status = 400; message = 'That record already exists'; }
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Server error';
  }
  res.status(status).json({ message });
};
