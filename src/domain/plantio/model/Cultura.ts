export interface Cultura {
  id: number;
  slug: 'milho' | 'feijao-caupi' | 'mamona';
  nome: string;
  janelaDias: number;
  limiarPadraoMm: number;
  fonteLimiar: string;
  orientacaoFavoravel: string;
  orientacaoAtencao: string;
  orientacaoInapto: string;
}
