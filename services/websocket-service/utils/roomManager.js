const logger = require('../config/logger');

/**
 * Room naming conventions and helpers
 */
class RoomManager {
  /**
   * Generate room name for a survey
   */
  static getSurveyRoom(surveyId) {
    return `survey:${surveyId}`;
  }

  /**
   * Generate room name for a project
   */
  static getProjectRoom(projectId) {
    return `project:${projectId}`;
  }

  /**
   * Generate room name for a user
   */
  static getUserRoom(userId) {
    return `user:${userId}`;
  }

  /**
   * Get global broadcast room
   */
  static getGlobalRoom() {
    return 'global';
  }

  /**
   * Parse room name to get type and ID
   */
  static parseRoom(roomName) {
    const parts = roomName.split(':');
    if (parts.length === 2) {
      return {
        type: parts[0],
        id: parts[1]
      };
    } else if (roomName === 'global') {
      return {
        type: 'global',
        id: null
      };
    }
    return null;
  }

  /**
   * Validate room name format
   */
  static isValidRoom(roomName) {
    if (roomName === 'global') return true;

    const validPrefixes = ['survey:', 'project:', 'user:'];
    return validPrefixes.some(prefix => roomName.startsWith(prefix));
  }

  /**
   * Check if user can join room
   */
  static canJoinRoom(socket, roomName) {
    const parsed = this.parseRoom(roomName);
    if (!parsed) return false;

    // Anonymous users can only join global room
    if (socket.user.isAnonymous) {
      return parsed.type === 'global';
    }

    // Authenticated users can join any room
    // Additional permission checks can be added here
    return true;
  }

  /**
   * Get all rooms a user should auto-join
   */
  static getAutoJoinRooms(socket) {
    const rooms = ['global']; // Everyone joins global

    if (!socket.user.isAnonymous) {
      // Authenticated users auto-join their user room
      rooms.push(this.getUserRoom(socket.user.id));
    }

    return rooms;
  }

  /**
   * Format room info for client
   */
  static formatRoomInfo(roomName, connectionCount) {
    const parsed = this.parseRoom(roomName);
    return {
      name: roomName,
      type: parsed?.type || 'unknown',
      id: parsed?.id || null,
      connections: connectionCount
    };
  }
}

module.exports = RoomManager;
