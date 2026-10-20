package br.com.ifba.clima.fonte;

import java.time.LocalDate;

/** Chuva diária devolvida por uma fonte de dados. */
public record ChuvaObservada(LocalDate data, double mm) {
}
