ALTER TABLE public.knowledge_gaps DROP CONSTRAINT knowledge_gaps_status_check;
UPDATE public.knowledge_gaps SET status='in_progress' WHERE status='assigned';
UPDATE public.knowledge_gaps SET status='resolved' WHERE status='closed';
ALTER TABLE public.knowledge_gaps ADD CONSTRAINT knowledge_gaps_status_check CHECK (status = ANY (ARRAY['open','in_progress','resolved','ignored']));