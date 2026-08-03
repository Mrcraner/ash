CREATE DATABASE IF NOT EXISTS ash_dev DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS ash_prod DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS ash_test DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Local compose user already created via MYSQL_USER; grant across envs for flexibility.
GRANT ALL PRIVILEGES ON ash_dev.* TO 'ash'@'%';
GRANT ALL PRIVILEGES ON ash_prod.* TO 'ash'@'%';
GRANT ALL PRIVILEGES ON ash_test.* TO 'ash'@'%';
FLUSH PRIVILEGES;
