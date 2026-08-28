-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: mangrooves_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(60) DEFAULT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `details_json` longtext DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_date` (`user_id`,`created_at`),
  KEY `idx_audit_action_date` (`action`,`created_at`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:47:23'),(2,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:47:36'),(3,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:49:00'),(5,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:50:27'),(6,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:50:36'),(7,1,'auth.logout','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:50:38'),(8,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:51:10'),(9,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:51:13'),(10,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:51:13'),(11,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:23'),(12,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(13,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(14,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(15,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(16,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(17,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(18,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(19,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:52:41'),(20,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(21,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(22,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(23,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(24,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(25,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(26,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:09'),(27,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:10'),(28,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:10'),(29,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:10'),(30,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:11'),(31,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:11'),(32,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:11'),(33,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:11'),(34,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:11'),(35,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:54:38'),(36,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:17'),(37,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:17'),(38,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(39,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(40,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(41,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(42,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(43,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:18'),(44,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:32'),(45,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:35'),(46,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:35'),(47,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:40'),(48,3,'analytics.python_generated','analytics',NULL,'{\"output\":\"Generated analytics in C:\\\\mangrooves_v2\\\\public\\\\generated\\\\analytics\"}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:55:46'),(50,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 06:59:01'),(51,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:00:00'),(52,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:13'),(53,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:27'),(54,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(55,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(56,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(57,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(58,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(59,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(60,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:28'),(61,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:01:39'),(62,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:03:48'),(63,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:49'),(64,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:50'),(65,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:50'),(66,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:51'),(67,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:51'),(68,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:51'),(69,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:51'),(70,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:22:51'),(71,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:24:42'),(72,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:25:00'),(73,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:37:17'),(74,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:37:47'),(75,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:43:51'),(76,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:47:37'),(77,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:47:57'),(78,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:48:49'),(79,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:48:58'),(80,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:14'),(81,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:15'),(82,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:17'),(83,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:19'),(84,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:19'),(85,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:19'),(86,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:19'),(87,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:49:19'),(88,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:52:02'),(89,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 07:52:17'),(90,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:53'),(91,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:53'),(92,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:55'),(93,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:57'),(94,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:57'),(95,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:57'),(96,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:57'),(97,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:01:57'),(98,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:22'),(99,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:23'),(100,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:24'),(101,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:26'),(102,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:26'),(103,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:26'),(104,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:26'),(105,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:04:26'),(106,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:03'),(107,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:04'),(108,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:05'),(109,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:07'),(110,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:07'),(111,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:07'),(112,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:07'),(113,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:10:07'),(114,1,'auth.login','user','1',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:42'),(115,1,'access.denied','route',NULL,'{\"required_roles\":[\"expert\",\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:43'),(116,2,'auth.login','user','2',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:45'),(117,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:47'),(118,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:47'),(119,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:47'),(120,2,'access.denied','route',NULL,'{\"required_roles\":[\"system_admin\"]}','127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:47'),(121,3,'auth.login','user','3',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.9168','2026-08-24 08:11:47');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `badges` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(60) NOT NULL,
  `badge_name` varchar(120) NOT NULL,
  `metric` enum('verified_reports','verified_followups','distinct_species','uncorrected_reports','steward_days') NOT NULL,
  `target_value` int(10) unsigned NOT NULL,
  `description` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_badge_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badges`
--

LOCK TABLES `badges` WRITE;
/*!40000 ALTER TABLE `badges` DISABLE KEYS */;
INSERT INTO `badges` VALUES (1,'first_report','First Report','verified_reports',1,'Submitted your first verified report!','img/badges/first-report.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(2,'bronze_guardian','Bronze Guardian','verified_reports',5,'Submitted 5 verified reports!','img/badges/bronze.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(3,'silver_guardian','Silver Guardian','verified_reports',15,'Submitted 15 verified reports!','img/badges/silver.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(4,'gold_guardian','Gold Guardian','verified_reports',30,'Submitted 30 verified reports!','img/badges/gold.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(5,'followup_hero','Follow-up Hero','verified_followups',20,'Submitted 20 verified follow-up reports!','img/badges/followup.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(6,'species_spotter','Species Spotter','distinct_species',10,'Reported 10 different verified species!','img/badges/species.svg',1,'2026-08-24 06:29:54','2026-08-24 06:29:54');
/*!40000 ALTER TABLE `badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barangays`
--

DROP TABLE IF EXISTS `barangays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `barangays` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `city_municipality` varchar(120) NOT NULL DEFAULT 'Cebu City',
  `province` varchar(120) NOT NULL DEFAULT 'Cebu',
  `country_code` char(2) NOT NULL DEFAULT 'PH',
  `psgc_code` varchar(20) DEFAULT NULL,
  `center_lat` decimal(10,8) NOT NULL,
  `center_lng` decimal(11,8) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_barangay_jurisdiction` (`name`,`city_municipality`,`province`),
  CONSTRAINT `chk_barangay_lat` CHECK (`center_lat` between -90 and 90),
  CONSTRAINT `chk_barangay_lng` CHECK (`center_lng` between -180 and 180)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barangays`
--

LOCK TABLES `barangays` WRITE;
/*!40000 ALTER TABLE `barangays` DISABLE KEYS */;
INSERT INTO `barangays` VALUES (1,'Inayawan','Cebu City','Cebu','PH',NULL,10.28330000,123.88330000,'2026-08-24 06:29:54','2026-08-24 06:29:54');
/*!40000 ALTER TABLE `barangays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `health_criteria`
--

DROP TABLE IF EXISTS `health_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `health_criteria` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `question_text` varchar(255) NOT NULL,
  `selection_mode` enum('single','multiple') NOT NULL DEFAULT 'single',
  `score_group` enum('health','context','environment') NOT NULL DEFAULT 'context',
  `guide_image` varchar(255) DEFAULT NULL,
  `display_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_health_criteria_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `health_criteria`
--

LOCK TABLES `health_criteria` WRITE;
/*!40000 ALTER TABLE `health_criteria` DISABLE KEYS */;
INSERT INTO `health_criteria` VALUES (1,'leaf_color','Leaf Color','What color are the leaves?','single','health','img/guides/leaf-color.png',1,1),(2,'leaf_condition','Leaf Condition','How do the leaves look?','single','context','img/guides/leaf-condition.png',2,1),(3,'pests','Pests','Are there signs of pests?','single','health','img/guides/pests.png',3,1),(4,'roots','Roots','How stable do the roots look?','single','health','img/guides/roots.png',4,1),(5,'bark_trunk','Bark / Trunk','How does the bark or trunk look?','single','context','img/guides/bark.png',5,1),(6,'bio_indicators','Bio-Indicators','What animals did you see?','multiple','environment','img/guides/bio-indicators.png',6,1),(7,'negative_signs','Negative Signs','What negative signs did you see?','multiple','environment','img/guides/negative-signs.png',7,1);
/*!40000 ALTER TABLE `health_criteria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `health_options`
--

DROP TABLE IF EXISTS `health_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `health_options` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `criteria_id` smallint(5) unsigned NOT NULL,
  `code` varchar(80) NOT NULL,
  `label` varchar(190) NOT NULL,
  `points` smallint(6) NOT NULL DEFAULT 0,
  `image_path` varchar(255) DEFAULT NULL,
  `display_order` smallint(5) unsigned NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_health_option_code` (`criteria_id`,`code`),
  KEY `idx_health_options_criteria` (`criteria_id`,`active`,`display_order`),
  CONSTRAINT `fk_health_options_criteria` FOREIGN KEY (`criteria_id`) REFERENCES `health_criteria` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `health_options`
--

LOCK TABLES `health_options` WRITE;
/*!40000 ALTER TABLE `health_options` DISABLE KEYS */;
INSERT INTO `health_options` VALUES (1,1,'green','Green',2,NULL,1,1),(2,1,'light_yellow_green','Light / Yellow-Green',1,NULL,2,1),(3,1,'brown_yellow_brown','Brown / Yellow-Brown',0,NULL,3,1),(4,2,'smooth_healthy','Smooth & Healthy',2,NULL,1,1),(5,2,'waxy_curled','Waxy / Curled / Pointing Up',1,NULL,2,1),(6,2,'damaged_spots','Damaged / Holes / Dark Spots',0,NULL,3,1),(7,2,'brittle_dry','Brittle / Dry',0,NULL,4,1),(8,3,'none_visible','None Visible',2,NULL,1,1),(9,3,'few_holes','Few Holes / Bites',1,NULL,2,1),(10,3,'many_holes','Many Holes / Webbing',0,NULL,3,1),(11,4,'firm_intact','Firm & Intact',2,NULL,1,1),(12,4,'loose_damage','Loose / Some Damage',1,NULL,2,1),(13,4,'exposed_erosion','Exposed / Erosion Visible',0,NULL,3,1),(14,4,'dead_rotten','Dead / Rotten',0,NULL,4,1),(15,5,'intact_smooth','Intact / Smooth',2,NULL,1,1),(16,5,'peeling_cracks','Slightly Peeling / Cracks',1,NULL,2,1),(17,5,'deep_fissures','Deep Cracks / Fissures',0,NULL,3,1),(18,5,'missing_damage','Missing / Large Damage',0,NULL,4,1),(19,6,'crabs','Crabs (Tambasakan)',1,NULL,1,1),(20,6,'birds','Birds (Herons / Egrets)',1,NULL,2,1),(21,6,'small_fish','Small Fish (Juveniles)',1,NULL,3,1),(22,6,'snails','Snails / Shells',1,NULL,4,1),(23,6,'pollinators','Butterflies / Bees',1,NULL,5,1),(24,7,'mosquitoes','Many Mosquitoes',-1,NULL,1,1),(25,7,'trash','Trash / Plastic Visible',-1,NULL,2,1),(26,7,'no_animals','No Animals at All',-1,NULL,3,1);
/*!40000 ALTER TABLE `health_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `was_successful` tinyint(1) NOT NULL DEFAULT 0,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_email_time` (`email`,`attempted_at`),
  KEY `idx_login_attempts_ip_time` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
INSERT INTO `login_attempts` VALUES (1,'expert@test.com','127.0.0.1',1,'2026-08-24 06:47:23'),(2,'admin@test.com','127.0.0.1',1,'2026-08-24 06:47:36'),(3,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:49:00'),(4,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:50:27'),(5,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:50:36'),(6,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:51:10'),(7,'expert@test.com','127.0.0.1',1,'2026-08-24 06:51:13'),(8,'admin@test.com','127.0.0.1',1,'2026-08-24 06:51:13'),(9,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:52:23'),(10,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:52:41'),(11,'expert@test.com','127.0.0.1',1,'2026-08-24 06:52:41'),(12,'admin@test.com','127.0.0.1',1,'2026-08-24 06:52:41'),(13,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:54:09'),(14,'expert@test.com','127.0.0.1',1,'2026-08-24 06:54:09'),(15,'admin@test.com','127.0.0.1',1,'2026-08-24 06:54:10'),(16,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:54:10'),(17,'expert@test.com','127.0.0.1',1,'2026-08-24 06:54:10'),(18,'admin@test.com','127.0.0.1',1,'2026-08-24 06:54:11'),(19,'expert@test.com','127.0.0.1',1,'2026-08-24 06:54:38'),(20,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:55:17'),(21,'expert@test.com','127.0.0.1',1,'2026-08-24 06:55:18'),(22,'admin@test.com','127.0.0.1',1,'2026-08-24 06:55:18'),(23,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:55:32'),(24,'expert@test.com','127.0.0.1',1,'2026-08-24 06:55:35'),(25,'admin@test.com','127.0.0.1',1,'2026-08-24 06:55:35'),(26,'admin@test.com','127.0.0.1',1,'2026-08-24 06:55:40'),(27,'guardian@test.com','127.0.0.1',1,'2026-08-24 06:59:01'),(28,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:00:00'),(29,'admin@test.com','127.0.0.1',1,'2026-08-24 07:01:13'),(30,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:01:27'),(31,'expert@test.com','127.0.0.1',1,'2026-08-24 07:01:28'),(32,'admin@test.com','127.0.0.1',1,'2026-08-24 07:01:28'),(33,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:01:39'),(34,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:03:48'),(35,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:22:49'),(36,'expert@test.com','127.0.0.1',1,'2026-08-24 07:22:50'),(37,'admin@test.com','127.0.0.1',1,'2026-08-24 07:22:51'),(38,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:24:42'),(39,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:25:00'),(40,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:37:17'),(41,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:37:47'),(42,'admin@test.com','127.0.0.1',1,'2026-08-24 07:43:51'),(43,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:47:37'),(44,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:47:57'),(45,'admin@test.com','127.0.0.1',1,'2026-08-24 07:48:49'),(46,'admin@test.com','127.0.0.1',1,'2026-08-24 07:48:58'),(47,'guardian@test.com','127.0.0.1',1,'2026-08-24 07:49:14'),(48,'expert@test.com','127.0.0.1',1,'2026-08-24 07:49:17'),(49,'admin@test.com','127.0.0.1',1,'2026-08-24 07:49:19'),(50,'admin@test.com','127.0.0.1',1,'2026-08-24 07:52:02'),(51,'admin@test.com','127.0.0.1',1,'2026-08-24 07:52:17'),(52,'guardian@test.com','127.0.0.1',1,'2026-08-24 08:01:53'),(53,'expert@test.com','127.0.0.1',1,'2026-08-24 08:01:55'),(54,'admin@test.com','127.0.0.1',1,'2026-08-24 08:01:57'),(55,'guardian@test.com','127.0.0.1',1,'2026-08-24 08:04:22'),(56,'expert@test.com','127.0.0.1',1,'2026-08-24 08:04:24'),(57,'admin@test.com','127.0.0.1',1,'2026-08-24 08:04:26'),(58,'guardian@test.com','127.0.0.1',1,'2026-08-24 08:10:03'),(59,'expert@test.com','127.0.0.1',1,'2026-08-24 08:10:05'),(60,'admin@test.com','127.0.0.1',1,'2026-08-24 08:10:07'),(61,'guardian@test.com','127.0.0.1',1,'2026-08-24 08:11:42'),(62,'expert@test.com','127.0.0.1',1,'2026-08-24 08:11:45'),(63,'admin@test.com','127.0.0.1',1,'2026-08-24 08:11:47');
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mangrove_clusters`
--

DROP TABLE IF EXISTS `mangrove_clusters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mangrove_clusters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cluster_code` varchar(40) NOT NULL,
  `barangay_id` smallint(5) unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `sitio_name` varchar(120) DEFAULT NULL,
  `center_lat` decimal(10,8) NOT NULL,
  `center_lng` decimal(11,8) NOT NULL,
  `radius_meters` smallint(5) unsigned NOT NULL DEFAULT 75,
  `species_id` smallint(5) unsigned DEFAULT NULL,
  `rarity_level` enum('Common','Vulnerable','Rare','Unassigned') NOT NULL DEFAULT 'Unassigned',
  `initial_seedlings` int(10) unsigned NOT NULL DEFAULT 0,
  `latest_health` enum('Healthy','Stressed','At Risk','Unknown') NOT NULL DEFAULT 'Unknown',
  `verified_count` int(10) unsigned NOT NULL DEFAULT 0,
  `latest_report_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cluster_code` (`cluster_code`),
  KEY `idx_clusters_barangay` (`barangay_id`),
  KEY `idx_clusters_species` (`species_id`),
  KEY `idx_clusters_health` (`latest_health`),
  CONSTRAINT `fk_clusters_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`),
  CONSTRAINT `fk_clusters_species` FOREIGN KEY (`species_id`) REFERENCES `mangrove_species` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_cluster_lat` CHECK (`center_lat` between -90 and 90),
  CONSTRAINT `chk_cluster_lng` CHECK (`center_lng` between -180 and 180)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mangrove_clusters`
--

LOCK TABLES `mangrove_clusters` WRITE;
/*!40000 ALTER TABLE `mangrove_clusters` DISABLE KEYS */;
INSERT INTO `mangrove_clusters` VALUES (1,'MGC-INY-001',1,'Heritage Boardwalk Cluster','Sitio Seaside',10.28386000,123.88414000,75,5,'Common',100,'Stressed',2,'2026-07-24 14:46:31','2026-08-24 06:29:54','2026-08-24 06:46:31'),(2,'MGC-INY-002',1,'North Restoration Plot','Inayawan North',10.28502000,123.88242000,75,1,'Common',80,'Healthy',1,'2026-08-14 14:46:31','2026-08-24 06:29:54','2026-08-24 06:46:31'),(3,'MGC-INY-003',1,'Estuary Edge Cluster','Lower Estuary',10.28172000,123.88508000,75,6,'Vulnerable',60,'At Risk',1,'2026-08-20 14:46:31','2026-08-24 06:29:54','2026-08-24 06:46:31');
/*!40000 ALTER TABLE `mangrove_clusters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mangrove_species`
--

DROP TABLE IF EXISTS `mangrove_species`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mangrove_species` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `scientific_name` varchar(190) NOT NULL,
  `common_name` varchar(190) NOT NULL,
  `local_name` varchar(255) DEFAULT NULL,
  `family` varchar(120) DEFAULT NULL,
  `iucn_code` varchar(10) DEFAULT NULL,
  `iucn_label` varchar(60) DEFAULT NULL,
  `population_trend` enum('Increasing','Stable','Decreasing','Unknown') NOT NULL DEFAULT 'Unknown',
  `root_type` varchar(190) NOT NULL,
  `root_type_image` varchar(255) DEFAULT NULL,
  `leaf_shape` varchar(190) NOT NULL,
  `leaf_shape_image` varchar(255) DEFAULT NULL,
  `bark_texture` varchar(255) NOT NULL,
  `bark_texture_image` varchar(255) DEFAULT NULL,
  `provenance` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_species_scientific_name` (`scientific_name`),
  KEY `idx_species_active_common` (`active`,`common_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mangrove_species`
--

LOCK TABLES `mangrove_species` WRITE;
/*!40000 ALTER TABLE `mangrove_species` DISABLE KEYS */;
INSERT INTO `mangrove_species` VALUES (1,'Avicennia marina','Grey/White Mangrove','Miapi, Bungalon, Api-api','Avicenniaceae','LC','Least Concern','Decreasing','Pneumatophores (pencil-like)',NULL,'Elliptic',NULL,'Smooth with thin flakes, greenish brown',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(2,'Avicennia rumphiana','White Mangrove','Miapi, Bungalon, Api-api','Avicenniaceae','VU','Vulnerable','Decreasing','Pneumatophores (pencil-like projections)',NULL,'Elliptic',NULL,'Slightly rough, brown',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(3,'Lumnitzera racemosa','White-Flowered Black Mangrove','Culasi, Tabao','Combretaceae','LC','Least Concern','Decreasing','Looping (older trees)',NULL,'Obovate',NULL,'Rough, fibrous, brown with deep fissures',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(4,'Nypa fruticans','Mangrove Palm','Nipa, Sapsap','Palmae','LC','Least Concern','Unknown','Creeping rhizomes',NULL,'Lanceolate (leaflets)',NULL,'N/A (palm)',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(5,'Rhizophora apiculata','Tall-stilt Mangrove','Bakhaw, Bakhaw lalaki','Rhizophoraceae','LC','Least Concern','Decreasing','Prop roots (stilt roots)',NULL,'Elliptic',NULL,'Rough, grayish to brown',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(6,'Rhizophora mucronata','Red Mangrove','Bakhaw, Bakhaw babae','Rhizophoraceae','LC','Least Concern','Decreasing','Prop roots',NULL,'Elliptic (with dark dots)',NULL,'Rough, grayish to brown',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(7,'Rhizophora stylosa','Red Mangrove','Bakhaw, Bakhaw bato','Rhizophoraceae','LC','Least Concern','Decreasing','Prop roots',NULL,'Elliptic (waxy, leaves point upward)',NULL,'Rough, grayish to brown',NULL,'CCENRO-derived species workbook supplied for the ManGROOVES pilot',1,'2026-08-24 06:29:54','2026-08-24 06:29:54');
/*!40000 ALTER TABLE `mangrove_species` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` varchar(60) NOT NULL,
  `title` varchar(160) NOT NULL,
  `message` varchar(500) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `dedupe_key` varchar(190) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notifications_dedupe` (`dedupe_key`),
  KEY `idx_notifications_user_read` (`user_id`,`read_at`,`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'followup_overdue','Follow-up overdue','Heritage Boardwalk Cluster needs a new monitoring report.','submit-report.php?parent=2','followup_overdue:2',NULL,'2026-08-23 06:29:54'),(2,1,'badge_earned','Badge earned: First Report','Your first verified report unlocked a recognition badge.','badges.php',NULL,'2026-07-05 14:29:54','2026-06-25 06:29:54'),(3,5,'needs_attention','Expert marked a site for attention','The Estuary Edge Cluster needs priority cleanup and erosion assessment.','reports.php?id=4',NULL,NULL,'2026-08-20 06:29:54');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registration_attempts`
--

DROP TABLE IF EXISTS `registration_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `registration_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `was_successful` tinyint(1) NOT NULL DEFAULT 0,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_registration_attempts_ip_time` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registration_attempts`
--

LOCK TABLES `registration_attempts` WRITE;
/*!40000 ALTER TABLE `registration_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `registration_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_observations`
--

DROP TABLE IF EXISTS `report_observations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `report_observations` (
  `report_id` bigint(20) unsigned NOT NULL,
  `criteria_id` smallint(5) unsigned NOT NULL,
  `option_id` smallint(5) unsigned NOT NULL,
  `points_snapshot` smallint(6) NOT NULL DEFAULT 0,
  `criteria_code_snapshot` varchar(60) DEFAULT NULL,
  `criterion_name_snapshot` varchar(120) DEFAULT NULL,
  `score_group_snapshot` varchar(30) DEFAULT NULL,
  `selection_mode_snapshot` varchar(20) DEFAULT NULL,
  `option_code_snapshot` varchar(80) DEFAULT NULL,
  `option_label_snapshot` varchar(190) DEFAULT NULL,
  `criteria_order_snapshot` smallint(5) unsigned DEFAULT NULL,
  `option_order_snapshot` smallint(5) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`report_id`,`option_id`),
  KEY `idx_observations_criteria` (`criteria_id`),
  KEY `fk_observations_option` (`option_id`),
  CONSTRAINT `fk_observations_criteria` FOREIGN KEY (`criteria_id`) REFERENCES `health_criteria` (`id`),
  CONSTRAINT `fk_observations_option` FOREIGN KEY (`option_id`) REFERENCES `health_options` (`id`),
  CONSTRAINT `fk_observations_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_observations`
--

LOCK TABLES `report_observations` WRITE;
/*!40000 ALTER TABLE `report_observations` DISABLE KEYS */;
INSERT INTO `report_observations` VALUES (1,1,1,2,'leaf_color','Leaf Color','health','single','green','Green',1,1,'2026-08-24 06:29:54'),(1,2,4,2,'leaf_condition','Leaf Condition','context','single','smooth_healthy','Smooth & Healthy',2,1,'2026-08-24 06:29:54'),(1,3,8,2,'pests','Pests','health','single','none_visible','None Visible',3,1,'2026-08-24 06:29:54'),(1,4,11,2,'roots','Roots','health','single','firm_intact','Firm & Intact',4,1,'2026-08-24 06:29:54'),(1,5,15,2,'bark_trunk','Bark / Trunk','context','single','intact_smooth','Intact / Smooth',5,1,'2026-08-24 06:29:54'),(1,6,19,1,'bio_indicators','Bio-Indicators','environment','multiple','crabs','Crabs (Tambasakan)',6,1,'2026-08-24 06:29:54'),(1,6,20,1,'bio_indicators','Bio-Indicators','environment','multiple','birds','Birds (Herons / Egrets)',6,2,'2026-08-24 06:29:54'),(2,1,2,1,'leaf_color','Leaf Color','health','single','light_yellow_green','Light / Yellow-Green',1,2,'2026-08-24 06:29:54'),(2,2,5,1,'leaf_condition','Leaf Condition','context','single','waxy_curled','Waxy / Curled / Pointing Up',2,2,'2026-08-24 06:29:54'),(2,3,9,1,'pests','Pests','health','single','few_holes','Few Holes / Bites',3,2,'2026-08-24 06:29:54'),(2,4,12,1,'roots','Roots','health','single','loose_damage','Loose / Some Damage',4,2,'2026-08-24 06:29:54'),(2,5,16,1,'bark_trunk','Bark / Trunk','context','single','peeling_cracks','Slightly Peeling / Cracks',5,2,'2026-08-24 06:29:54'),(2,6,19,1,'bio_indicators','Bio-Indicators','environment','multiple','crabs','Crabs (Tambasakan)',6,1,'2026-08-24 06:29:54'),(3,1,1,2,'leaf_color','Leaf Color','health','single','green','Green',1,1,'2026-08-24 06:29:54'),(3,2,4,2,'leaf_condition','Leaf Condition','context','single','smooth_healthy','Smooth & Healthy',2,1,'2026-08-24 06:29:54'),(3,3,8,2,'pests','Pests','health','single','none_visible','None Visible',3,1,'2026-08-24 06:29:54'),(3,4,11,2,'roots','Roots','health','single','firm_intact','Firm & Intact',4,1,'2026-08-24 06:29:54'),(3,5,15,2,'bark_trunk','Bark / Trunk','context','single','intact_smooth','Intact / Smooth',5,1,'2026-08-24 06:29:54'),(3,6,19,1,'bio_indicators','Bio-Indicators','environment','multiple','crabs','Crabs (Tambasakan)',6,1,'2026-08-24 06:29:54'),(3,6,20,1,'bio_indicators','Bio-Indicators','environment','multiple','birds','Birds (Herons / Egrets)',6,2,'2026-08-24 06:29:54'),(3,6,21,1,'bio_indicators','Bio-Indicators','environment','multiple','small_fish','Small Fish (Juveniles)',6,3,'2026-08-24 06:29:54'),(4,1,3,0,'leaf_color','Leaf Color','health','single','brown_yellow_brown','Brown / Yellow-Brown',1,3,'2026-08-24 06:29:54'),(4,2,6,0,'leaf_condition','Leaf Condition','context','single','damaged_spots','Damaged / Holes / Dark Spots',2,3,'2026-08-24 06:29:54'),(4,3,9,1,'pests','Pests','health','single','few_holes','Few Holes / Bites',3,2,'2026-08-24 06:29:54'),(4,4,13,0,'roots','Roots','health','single','exposed_erosion','Exposed / Erosion Visible',4,3,'2026-08-24 06:29:54'),(4,5,17,0,'bark_trunk','Bark / Trunk','context','single','deep_fissures','Deep Cracks / Fissures',5,3,'2026-08-24 06:29:54'),(4,7,25,-1,'negative_signs','Negative Signs','environment','multiple','trash','Trash / Plastic Visible',7,2,'2026-08-24 06:29:54'),(5,1,2,1,'leaf_color','Leaf Color','health','single','light_yellow_green','Light / Yellow-Green',1,2,'2026-08-24 06:29:54'),(5,2,4,2,'leaf_condition','Leaf Condition','context','single','smooth_healthy','Smooth & Healthy',2,1,'2026-08-24 06:29:54'),(5,3,8,2,'pests','Pests','health','single','none_visible','None Visible',3,1,'2026-08-24 06:29:54'),(5,4,11,2,'roots','Roots','health','single','firm_intact','Firm & Intact',4,1,'2026-08-24 06:29:54'),(5,5,15,2,'bark_trunk','Bark / Trunk','context','single','intact_smooth','Intact / Smooth',5,1,'2026-08-24 06:29:54'),(5,6,19,1,'bio_indicators','Bio-Indicators','environment','multiple','crabs','Crabs (Tambasakan)',6,1,'2026-08-24 06:29:54'),(5,6,20,1,'bio_indicators','Bio-Indicators','environment','multiple','birds','Birds (Herons / Egrets)',6,2,'2026-08-24 06:29:54'),(6,1,1,2,'leaf_color','Leaf Color','health','single','green','Green',1,1,'2026-08-24 06:29:54'),(6,2,4,2,'leaf_condition','Leaf Condition','context','single','smooth_healthy','Smooth & Healthy',2,1,'2026-08-24 06:29:54'),(6,3,8,2,'pests','Pests','health','single','none_visible','None Visible',3,1,'2026-08-24 06:29:54'),(6,4,11,2,'roots','Roots','health','single','firm_intact','Firm & Intact',4,1,'2026-08-24 06:29:54'),(6,5,15,2,'bark_trunk','Bark / Trunk','context','single','intact_smooth','Intact / Smooth',5,1,'2026-08-24 06:29:54');
/*!40000 ALTER TABLE `report_observations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_code` varchar(40) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `barangay_id` smallint(5) unsigned NOT NULL,
  `cluster_id` bigint(20) unsigned DEFAULT NULL,
  `parent_report_id` bigint(20) unsigned DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `location_accuracy` decimal(8,2) DEFAULT NULL,
  `sitio_name` varchar(120) DEFAULT NULL,
  `photo_path` varchar(255) NOT NULL,
  `photo_original_name` varchar(255) DEFAULT NULL,
  `photo_mime` varchar(80) NOT NULL,
  `photo_sha256` char(64) DEFAULT NULL,
  `guardian_remarks` text DEFAULT NULL,
  `root_type` varchar(190) NOT NULL,
  `leaf_shape` varchar(190) NOT NULL,
  `bark_texture` varchar(255) NOT NULL,
  `suggested_species_id` smallint(5) unsigned DEFAULT NULL,
  `final_species_id` smallint(5) unsigned DEFAULT NULL,
  `species_confidence` decimal(5,2) DEFAULT NULL,
  `health_score` smallint(6) NOT NULL DEFAULT 0,
  `health_max_score` smallint(5) unsigned NOT NULL DEFAULT 6,
  `environmental_score` smallint(6) NOT NULL DEFAULT 0,
  `suggested_health` enum('Healthy','Stressed','At Risk') NOT NULL,
  `final_health` enum('Healthy','Stressed','At Risk') DEFAULT NULL,
  `observed_alive_count` int(10) unsigned DEFAULT NULL,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `needs_attention` tinyint(1) NOT NULL DEFAULT 0,
  `rarity_level` enum('Common','Vulnerable','Rare','Unassigned') NOT NULL DEFAULT 'Unassigned',
  `expert_id` bigint(20) unsigned DEFAULT NULL,
  `expert_feedback` text DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL,
  `next_followup_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_report_code` (`report_code`),
  KEY `idx_reports_user_status` (`user_id`,`status`),
  KEY `idx_reports_cluster_status_date` (`cluster_id`,`status`,`submitted_at`),
  KEY `idx_reports_status_submitted` (`status`,`submitted_at`),
  KEY `idx_reports_followup` (`user_id`,`next_followup_date`),
  KEY `idx_reports_species` (`final_species_id`,`status`),
  KEY `idx_reports_barangay` (`barangay_id`,`status`),
  KEY `fk_reports_parent` (`parent_report_id`),
  KEY `fk_reports_suggested_species` (`suggested_species_id`),
  KEY `fk_reports_expert` (`expert_id`),
  CONSTRAINT `fk_reports_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`),
  CONSTRAINT `fk_reports_cluster` FOREIGN KEY (`cluster_id`) REFERENCES `mangrove_clusters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_expert` FOREIGN KEY (`expert_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_final_species` FOREIGN KEY (`final_species_id`) REFERENCES `mangrove_species` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_parent` FOREIGN KEY (`parent_report_id`) REFERENCES `reports` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_suggested_species` FOREIGN KEY (`suggested_species_id`) REFERENCES `mangrove_species` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_report_lat` CHECK (`latitude` between -90 and 90),
  CONSTRAINT `chk_report_lng` CHECK (`longitude` between -180 and 180)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
INSERT INTO `reports` VALUES (1,'MGR-DEMO-0001',1,1,1,NULL,10.28386000,123.88414000,8.50,'Sitio Seaside','assets/img/hero-mangroves.png','demo-site.jpg','image/png',NULL,'New planting rows look healthy after high tide.','Prop roots (stilt roots)','Elliptic','Rough, grayish to brown',5,5,100.00,6,6,2,'Healthy','Healthy',85,'verified',0,'Common',2,'Healthy establishment. Continue monthly observations.','2026-06-24 14:29:54','2026-06-25 14:29:54','2026-07-25','2026-08-24 06:29:54','2026-08-24 06:29:54'),(2,'MGR-DEMO-0002',1,1,1,1,10.28385000,123.88416000,7.20,'Sitio Seaside','assets/img/hero-mangroves.png','demo-followup.jpg','image/png',NULL,'Some yellowing is now visible near the waterline.','Prop roots (stilt roots)','Elliptic','Rough, grayish to brown',5,5,100.00,3,6,1,'Stressed','Stressed',78,'verified',1,'Common',2,'Monitor the yellowing and check for drainage obstruction.','2026-07-23 14:29:54','2026-07-24 14:29:54','2026-08-23','2026-08-24 06:29:54','2026-08-24 06:29:54'),(3,'MGR-DEMO-0003',4,1,2,NULL,10.28502000,123.88242000,5.40,'Inayawan North','assets/img/hero-mangroves.png','demo-north.jpg','image/png',NULL,'Leaves and roots appear firm.','Pneumatophores (pencil-like)','Elliptic','Smooth with thin flakes, greenish brown',1,1,100.00,6,6,3,'Healthy','Healthy',74,'verified',0,'Common',2,'Good condition. Avoid stepping on pneumatophores.','2026-08-13 14:29:54','2026-08-14 14:29:54','2026-09-13','2026-08-24 06:29:54','2026-08-24 06:29:54'),(4,'MGR-DEMO-0004',5,1,3,NULL,10.28172000,123.88508000,11.00,'Lower Estuary','assets/img/hero-mangroves.png','demo-estuary.jpg','image/png',NULL,'Exposed roots and plastic were observed after heavy rain.','Prop roots','Elliptic (with dark dots)','Rough, grayish to brown',6,6,100.00,1,6,-1,'At Risk','At Risk',38,'verified',1,'Vulnerable',2,'Priority cleanup and erosion assessment recommended.','2026-08-19 14:29:54','2026-08-20 14:29:54','2026-08-29','2026-08-24 06:29:54','2026-08-24 06:29:54'),(5,'MGR-DEMO-0005',1,1,NULL,NULL,10.28268000,123.88380000,6.80,'Central Shore','assets/img/hero-mangroves.png','demo-pending.jpg','image/png',NULL,'Possible new observation site near the creek mouth.','Pneumatophores (pencil-like projections)','Elliptic','Slightly rough, brown',2,NULL,100.00,5,6,2,'Stressed',NULL,50,'pending',0,'Unassigned',NULL,NULL,'2026-08-23 14:29:54',NULL,NULL,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(6,'MGR-DEMO-0006',4,1,NULL,NULL,10.28050000,123.88600000,22.00,'Outside Pilot Edge','assets/img/hero-mangroves.png','demo-rejected.jpg','image/png',NULL,'Image was taken during a site walk.','Prop roots','Elliptic','Rough, grayish to brown',5,NULL,82.00,6,6,0,'Healthy',NULL,NULL,'rejected',0,'Unassigned',2,'The photo does not clearly show the reported mangrove or its roots. Please retake it closer to the plant.','2026-08-04 14:29:54','2026-08-05 14:29:54',NULL,'2026-08-24 06:29:54','2026-08-24 06:29:54');
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_badges`
--

DROP TABLE IF EXISTS `user_badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_badges` (
  `user_id` bigint(20) unsigned NOT NULL,
  `badge_id` smallint(5) unsigned NOT NULL,
  `badge_name_snapshot` varchar(120) DEFAULT NULL,
  `description_snapshot` varchar(255) DEFAULT NULL,
  `metric_snapshot` varchar(60) DEFAULT NULL,
  `target_value_snapshot` int(10) unsigned DEFAULT NULL,
  `image_path_snapshot` varchar(255) DEFAULT NULL,
  `earned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`badge_id`),
  KEY `fk_user_badges_badge` (`badge_id`),
  CONSTRAINT `fk_user_badges_badge` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_badges_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_badges`
--

LOCK TABLES `user_badges` WRITE;
/*!40000 ALTER TABLE `user_badges` DISABLE KEYS */;
INSERT INTO `user_badges` VALUES (1,1,'First Report','Submitted your first verified report!','verified_reports',1,'img/badges/first-report.svg','2026-06-25 06:29:54'),(4,1,'First Report','Submitted your first verified report!','verified_reports',1,'img/badges/first-report.svg','2026-08-14 06:29:54'),(5,1,'First Report','Submitted your first verified report!','verified_reports',1,'img/badges/first-report.svg','2026-08-20 06:29:54');
/*!40000 ALTER TABLE `user_badges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('guardian','expert','system_admin') NOT NULL DEFAULT 'guardian',
  `barangay_id` smallint(5) unsigned DEFAULT NULL,
  `status` enum('active','suspended') NOT NULL DEFAULT 'active',
  `session_version` int(10) unsigned NOT NULL DEFAULT 0,
  `privacy_consent_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_status` (`role`,`status`),
  KEY `idx_users_barangay` (`barangay_id`),
  CONSTRAINT `fk_users_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test Guardian','guardian@test.com','09171234567','$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2','guardian',1,'active',0,'2026-08-24 14:29:54','2026-08-24 16:11:42','2026-08-24 06:29:54','2026-08-24 08:11:42'),(2,'Test Expert','expert@test.com',NULL,'$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2','expert',NULL,'active',0,'2026-08-24 14:29:54','2026-08-24 16:11:45','2026-08-24 06:29:54','2026-08-24 08:11:45'),(3,'Test Admin','admin@test.com',NULL,'$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2','system_admin',NULL,'active',0,'2026-08-24 14:29:54','2026-08-24 16:11:47','2026-08-24 06:29:54','2026-08-24 08:11:47'),(4,'Guardian Two','guardian2@test.com',NULL,'$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2','guardian',1,'active',0,'2026-08-24 14:29:54',NULL,'2026-08-24 06:29:54','2026-08-24 06:29:54'),(5,'Guardian Three','guardian3@test.com',NULL,'$2y$10$wpaLaMADs1Cwkb09DgB9KOCv.E8NS1F26NFoeRDvLOR/xt0FoJhw2','guardian',1,'active',0,'2026-08-24 14:29:54',NULL,'2026-08-24 06:29:54','2026-08-24 06:29:54');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verification_logs`
--

DROP TABLE IF EXISTS `verification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `verification_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint(20) unsigned NOT NULL,
  `verifier_id` bigint(20) unsigned NOT NULL,
  `action` enum('confirm','correct','reject') NOT NULL,
  `previous_status` enum('pending','verified','rejected') NOT NULL,
  `new_status` enum('pending','verified','rejected') NOT NULL,
  `previous_health` enum('Healthy','Stressed','At Risk') DEFAULT NULL,
  `new_health` enum('Healthy','Stressed','At Risk') DEFAULT NULL,
  `previous_species_id` smallint(5) unsigned DEFAULT NULL,
  `new_species_id` smallint(5) unsigned DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_verification_report_date` (`report_id`,`created_at`),
  KEY `idx_verification_verifier` (`verifier_id`,`created_at`),
  KEY `fk_verification_previous_species` (`previous_species_id`),
  KEY `fk_verification_new_species` (`new_species_id`),
  CONSTRAINT `fk_verification_new_species` FOREIGN KEY (`new_species_id`) REFERENCES `mangrove_species` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_verification_previous_species` FOREIGN KEY (`previous_species_id`) REFERENCES `mangrove_species` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_verification_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_verification_user` FOREIGN KEY (`verifier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_logs`
--

LOCK TABLES `verification_logs` WRITE;
/*!40000 ALTER TABLE `verification_logs` DISABLE KEYS */;
INSERT INTO `verification_logs` VALUES (1,1,2,'confirm','pending','verified','Healthy','Healthy',5,5,'Healthy establishment. Continue monthly observations.','2026-06-25 06:29:54'),(2,2,2,'confirm','pending','verified','Stressed','Stressed',5,5,'Monitor the yellowing and check for drainage obstruction.','2026-07-24 06:29:54'),(3,3,2,'confirm','pending','verified','Healthy','Healthy',1,1,'Good condition. Avoid stepping on pneumatophores.','2026-08-14 06:29:54'),(4,4,2,'correct','pending','verified','At Risk','At Risk',6,6,'Priority cleanup and erosion assessment recommended.','2026-08-20 06:29:54'),(5,6,2,'reject','pending','rejected','Healthy',NULL,5,NULL,'Photo evidence was insufficient.','2026-08-05 06:29:54');
/*!40000 ALTER TABLE `verification_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'mangrooves_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-24 16:24:49
