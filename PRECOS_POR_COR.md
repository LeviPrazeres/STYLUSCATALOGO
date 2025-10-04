# Sistema de Preços por Cor - StylusCatalog

## Como Funciona

O sistema agora suporta **preços diferentes para cada cor** do mesmo produto. Isso é especialmente útil para produtos onde diferentes cores têm custos de produção diferentes.

## Como Preencher na Planilha Google Sheets

### Formato na Coluna de Preço (Coluna F)

#### Para Produtos com Preço Fixo (Formato Antigo)
```
89,90
```
- Funciona normalmente como antes
- Todos os produtos com este formato continuam funcionando

#### Para Produtos com Preços por Cor (Novo Formato)
```
preto=300,00. branco=305,00. cinza=310,00
```

**Regras importantes:**
- Use ponto (.) para separar cada cor-preço
- Use igual (=) para separar cor do preço
- Use vírgula (,) para separar centavos no preço
- Espaços são opcionais mas recomendados para legibilidade

### Exemplos Práticos

#### Exemplo 1: Sapato com 3 cores diferentes
```
preto=250,00. branco=255,00. azul=260,00
```

#### Exemplo 2: Camiseta com 2 cores
```
branco=45,90. preto=47,50
```

#### Exemplo 3: Produto com muitas cores
```
vermelho=120,00. azul=125,00. verde=130,00. amarelo=135,00. rosa=140,00
```

## Como Funciona no Site

1. **Produto sem cores**: Mostra o preço fixo normalmente
2. **Produto com cores e preço fixo**: Mostra o preço fixo para todas as cores
3. **Produto com cores e preços por cor**: 
   - Mostra o primeiro preço por padrão
   - Quando o usuário seleciona uma cor, o preço muda automaticamente
   - O carrinho usa o preço correto da cor selecionada

## Compatibilidade

- ✅ **Produtos existentes**: Continuam funcionando normalmente
- ✅ **Preços fixos**: Funcionam como antes
- ✅ **Preços por cor**: Nova funcionalidade disponível
- ✅ **Carrinho**: Calcula corretamente baseado na cor selecionada
- ✅ **WhatsApp**: Envia o preço correto no pedido

## Exemplo Completo na Planilha

| Nome | Categoria | Tipo | Preço | Tamanho | Cores |
|------|-----------|------|-------|---------|-------|
| Sapato Nike | masculino | calcados | preto=300,00. branco=305,00 | preto=40,41,42. branco=39,40,41 | Preto, Branco |
| Camiseta Básica | feminino | roupas | 45,90 | P,M,G,GG | Branco, Preto, Azul |
| Bolsa Premium | feminino | acessorios | couro=450,00. sintetico=320,00 | Único | Couro, Sintético |

## Dicas Importantes

1. **Consistência**: Use sempre os mesmos nomes de cores na coluna de preço e na coluna de cores
2. **Formato**: Siga exatamente o formato `cor=preço. cor=preço`
3. **Pontuação**: Use vírgula para centavos e ponto para separar cores
4. **Teste**: Sempre teste no site após fazer alterações na planilha

## Troubleshooting

### Problema: Preço não muda ao selecionar cor
**Solução**: Verifique se os nomes das cores são idênticos nas colunas de preço e cores

### Problema: Produto não aparece
**Solução**: Verifique se não há erros de sintaxe no formato do preço

### Problema: Preço aparece como R$ 0,00
**Solução**: Verifique se o formato está correto e se os valores são números válidos
