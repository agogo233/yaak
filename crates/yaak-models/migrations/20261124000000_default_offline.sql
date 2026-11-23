-- Network checks default to off, for installs that already have a settings row.
UPDATE settings SET autoupdate = 0, check_notifications = 0 WHERE id = 'default';

ALTER TABLE settings ADD COLUMN check_plugin_updates BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE settings ADD COLUMN check_license BOOLEAN DEFAULT false NOT NULL;
