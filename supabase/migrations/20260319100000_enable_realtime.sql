-- Enable real-time change events for tasks and projects.
-- Without this, Supabase Realtime subscriptions on these tables
-- receive no events and dashboards never update live.
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Verify both tables are in the publication:
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename IN ('tasks', 'projects');
