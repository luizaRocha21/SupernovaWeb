export interface MensagemHistoricoChatDTO {
  papel: 'usuario' | 'assistente';
  texto: string;
}

export interface ChatIaRequestDTO {
  pergunta: string;
  localidadeId?: number;
  cultura?: string;
  lat?: number;
  lon?: number;
  historico?: MensagemHistoricoChatDTO[];
}

export interface ChatIaResponseDTO {
  resposta: string;
  provedor: 'GOOGLE_GEMINI_FREE_TIER' | 'POLLINATIONS_OPENAI_FREE' | 'MOTOR_AGROCLIMATICO_CAATINGA';
  contextoAgroclimatico: {
    localidade: string;
    temperaturaC: number;
    umidadeRelativaPct: number;
    chuvaAcumulada30DiasMm: number;
    chuvaUltimos7DiasMm: number;
    normalClimatologicaMesMm: number;
    statusGeralPlantio: string;
    resumoConsultivo: string;
  };
  geradoEm: string;
}

export interface ResumoVozRequestDTO {
  pagina?: string;
  localidadeId?: number;
  textoContexto?: string;
}

export interface ResumoVozResponseDTO {
  resumoFalado: string;
  provedor: string;
  localidade: string;
  geradoEm: string;
}
