/*
 Navicat Premium Dump SQL

 Source Server         : sqlhub-wyksean-tmp
 Source Server Type    : MySQL
 Source Server Version : 80040 (8.0.40)
 Source Host           : mysql.sqlpub.com:3306
 Source Schema         : wyksean

 Target Server Type    : MySQL
 Target Server Version : 80040 (8.0.40)
 File Encoding         : 65001

 Date: 08/02/2025 18:51:00
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for contact
-- ----------------------------
DROP TABLE IF EXISTS `contact`;
CREATE TABLE `contact`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `contactId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `Contact_userId_contactId_key`(`userId` ASC, `contactId` ASC) USING BTREE,
  INDEX `contactId`(`contactId` ASC) USING BTREE,
  CONSTRAINT `contact_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `contact_ibfk_2` FOREIGN KEY (`contactId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of contact
-- ----------------------------
INSERT INTO `contact` VALUES (1, 1, 2, '2025-02-08 18:32:55.000');
INSERT INTO `contact` VALUES (2, 5, 3, '2025-02-08 10:49:15.254');

-- ----------------------------
-- Table structure for message
-- ----------------------------
DROP TABLE IF EXISTS `message`;
CREATE TABLE `message` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `senderId` int NOT NULL,
  `receiverId` int DEFAULT NULL,
  `isPrivate` tinyint(1) NOT NULL DEFAULT '0',
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `senderId` (`senderId`),
  KEY `receiverId` (`receiverId`),
  CONSTRAINT `message_ibfk_1` FOREIGN KEY (`senderId`) REFERENCES `user` (`id`),
  CONSTRAINT `message_ibfk_2` FOREIGN KEY (`receiverId`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;---------------------------
-- Records of message
-- ----------------------------
INSERT INTO `message` VALUES (1, '你好，这是一条测试消息', 1, 2, 1, 0, 0, '2025-02-08 18:32:55.000');
INSERT INTO `message` VALUES (2, '这是一条群聊消息', 2, NULL, 0, 1, 0, '2025-02-08 18:32:55.000');

-- ----------------------------
-- Table structure for session
-- ----------------------------
DROP TABLE IF EXISTS `session`;
CREATE TABLE `session`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `socketId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `joinedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `leftAt` datetime(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `userId`(`userId` ASC) USING BTREE,
  CONSTRAINT `session_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of session
-- ----------------------------

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `socketId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `User_username_key`(`username` ASC) USING BTREE,
  UNIQUE INDEX `User_email_key`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES (1, 'user1', '$2a$10$6KxGxvHhwwX.EvbXHgR8NOxgZkP8IM/TzxABtS5wACzklwcJEirati', 'user1@example.com', NULL, 'online', '2025-02-08 18:32:55.415');
INSERT INTO `user` VALUES (2, 'user2', '$2a$10$6KxGxvHhwwX.EvbXHgR8NOxgZkP8IM/TzxABtS5wACzklwcJEirati', 'user2@example.com', NULL, 'online', '2025-02-08 18:32:55.415');
INSERT INTO `user` VALUES (3, 'wyksean', '$2a$10$MgBdmMsRq7BeZOU2KHc9bOJiCEKMW/18QCldtTtVAiIczAjZ7xDr6', '3310719148@qq.com', 'g99C8_W6YX7OHsr9AABK', 'online', '2025-02-08 10:40:03.377');
INSERT INTO `user` VALUES (5, 'test', '$2a$10$PKGB9jfJxBDL0GvDze8kUOXtG/mFAZOBsw44j2NCo0wdmM1obVfGS', '1@qq.com', 'kakSKIys7lXyafmwAABM', 'online', '2025-02-08 10:48:08.423');

SET FOREIGN_KEY_CHECKS = 1;
