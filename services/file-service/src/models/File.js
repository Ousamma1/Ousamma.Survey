const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: String,
  thumbnail: {
    path: String,
    url: String
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
    hash: String
  },
  uploadedBy: String,
  relatedTo: {
    type: String, // 'response', 'survey', etc.
    enum: ['response', 'survey', 'template', 'other']
  },
  relatedId: mongoose.Schema.Types.ObjectId,
  isPublic: {
    type: Boolean,
    default: false
  },
  downloads: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
FileSchema.index({ filename: 1 });
FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ relatedTo: 1, relatedId: 1 });
FileSchema.index({ status: 1 });

// Methods
FileSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

FileSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('File', FileSchema);
