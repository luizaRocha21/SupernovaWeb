export interface ItemTemperaturaCidadeDTO {
  nome: string;
  uf: string;
  codigo_ibge?: string;
  temp_max_c: number;
  temp_min_c: number;
  condicao?: string;
}

export interface TemperaturaRadarResponseDTO {
  atualizado_em: string;
  limite: number;
  mais_quentes: ItemTemperaturaCidadeDTO[];
  mais_frias: ItemTemperaturaCidadeDTO[];
  fonte: string;
}
