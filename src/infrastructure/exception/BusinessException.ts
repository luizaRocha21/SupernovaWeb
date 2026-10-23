export class BusinessException extends Error {
  public readonly statusCode: number;
  public readonly codigo: string;

  constructor(mensagem: string, statusCode = 400, codigo = 'ERRO_NEGOCIO') {
    super(mensagem);
    this.name = 'BusinessException';
    this.statusCode = statusCode;
    this.codigo = codigo;
    Object.setPrototypeOf(this, BusinessException.prototype);
  }
}
