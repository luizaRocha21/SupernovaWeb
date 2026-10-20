package br.com.ifba.cultura.entity;

/** Como o agricultor decide plantar: acumulado em janela, volume de uma chuva ou início da estação. */
public enum TipoCriterio {
    ACUMULADO_JANELA,
    VOLUME_POR_EVENTO,
    INICIO_ESTACAO
}
