export interface AlertaRadarResponseDTO {
  id?: string | number;
  evento: string;
  severidade: string;
  riscos: string[];
  instrucoes: string[];
  inicio: string;
  fim: string;
  municipios_afetados: string[];
  codigos_ibge: string[];
  uf?: string;
  fonte?: string;
}
