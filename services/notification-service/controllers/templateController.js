const NotificationTemplate = require('../models/NotificationTemplate');

class TemplateController {
  /**
   * Get all templates
   */
  async getAll(req, res) {
    try {
      const { category, type, active } = req.query;
      const query = {};

      if (category) query.category = category;
      if (type) query.type = type;
      if (active !== undefined) query.active = active === 'true';

      const templates = await NotificationTemplate.find(query)
        .sort({ name: 1 });

      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get template by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const template = await NotificationTemplate.findById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        template
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get template by name
   */
  async getByName(req, res) {
    try {
      const { name } = req.params;

      const template = await NotificationTemplate.getByName(name);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        template
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create template
   */
  async create(req, res) {
    try {
      const {
        name,
        type,
        subject,
        body,
        htmlBody,
        variables,
        category,
        priority,
        metadata
      } = req.body;

      const template = await NotificationTemplate.create({
        name,
        type,
        subject,
        body,
        htmlBody,
        variables: variables || [],
        category: category || 'system',
        priority: priority || 'normal',
        metadata
      });

      res.status(201).json({
        success: true,
        template
      });
    } catch (error) {
      console.error('Error creating template:', error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Template with this name already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update template
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const template = await NotificationTemplate.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        template
      });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete template
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const template = await NotificationTemplate.findByIdAndDelete(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Render template with variables
   */
  async render(req, res) {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      const template = await NotificationTemplate.findById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      const rendered = template.render(variables || {});

      res.json({
        success: true,
        rendered
      });
    } catch (error) {
      console.error('Error rendering template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TemplateController();
