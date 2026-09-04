export type ProgramLanguageDto = "javascript";

export type ProgramDto = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sourceCode: string;
  language: ProgramLanguageDto;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProgramInput = {
  name: string;
  description?: string | null;
  sourceCode: string;
  language?: ProgramLanguageDto;
  isPublic?: boolean;
};

export type UpdateProgramInput = Partial<CreateProgramInput>;
