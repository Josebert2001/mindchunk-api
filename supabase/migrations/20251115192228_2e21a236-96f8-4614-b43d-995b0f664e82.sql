-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', false);

-- Storage policies for study materials
CREATE POLICY "Users can upload their own study materials"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own study materials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own study materials"
ON storage.objects
FOR DELETE
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Study materials table
CREATE TABLE public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  word_count INTEGER,
  estimated_read_time INTEGER,
  full_text TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own materials"
ON public.study_materials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own materials"
ON public.study_materials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own materials"
ON public.study_materials FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials"
ON public.study_materials FOR DELETE
USING (auth.uid() = user_id);

-- Study chunks table
CREATE TABLE public.study_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  main_concept TEXT,
  estimated_minutes INTEGER DEFAULT 5,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  key_terms TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.study_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their materials"
ON public.study_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.study_materials
    WHERE study_materials.id = study_chunks.material_id
    AND study_materials.user_id = auth.uid()
  )
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.study_chunks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quiz questions for their chunks"
ON public.quiz_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.study_chunks
    JOIN public.study_materials ON study_materials.id = study_chunks.material_id
    WHERE study_chunks.id = quiz_questions.chunk_id
    AND study_materials.user_id = auth.uid()
  )
);

-- Study progress table
CREATE TABLE public.study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chunk_id UUID NOT NULL REFERENCES public.study_chunks(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  quiz_score INTEGER,
  time_spent_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, chunk_id)
);

ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.study_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.study_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.study_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_study_materials_user_id ON public.study_materials(user_id);
CREATE INDEX idx_study_chunks_material_id ON public.study_chunks(material_id);
CREATE INDEX idx_quiz_questions_chunk_id ON public.quiz_questions(chunk_id);
CREATE INDEX idx_study_progress_user_chunk ON public.study_progress(user_id, chunk_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_materials_updated_at
BEFORE UPDATE ON public.study_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();