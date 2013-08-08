$(function() {
  var listTable = $("#card_list_table")
  var deckTable = $("#deck_table")

  $.fn.dataTableExt.afnFiltering.push(
    function(oSettings, aData, iDataIndex) {
      var tr = $(oSettings.aoData[iDataIndex].nTr)
      if(!tr.closest('table').is('#card_list_table')) {
        return true
      }
     
      var filters = $('#for_type input:checked')
      var typePassed = filters.length == 0 || filters.filter(function(i, e) {
        if(tr.is('[data-type=' + $(e).val() + ']')) {
          return true
        }
      }).length > 0

      var filters = $('#for_school input:checked')
      var schoolPassed = filters.length == 0 || filters.filter(function(i, e) {
        if(tr.is('[data-' + $(e).val() + ']')) {
          return true
        }
      }).length > 0
     
      return typePassed && schoolPassed
    }
  )

  var calcCardCost = function(mage, code_or_tr) {
    var listTr = code_or_tr.split ? getListTr(code_or_tr) : $(code_or_tr)
    var cost = 0
    if(listTr.data('or-cost')) {
      cost = 1000
      $(schools).each(function(i, s) {
        var a = listTr.data(s)
        if(a) {
          cost = Math.min(cost, a * mage[s])
        }
      })
    } else {
      $(schools).each(function(i, s) {
        cost += (listTr.data(s) || 0) * mage[s]
      })
    }
    return cost
  }

  var costHash = {}

  var getCardCost = function(code) {
    cost = costHash[code]
    if(!cost) {
      cost = calcCardCost(getMage(), getListTr(code))
      costHash[code] = cost
    }
    return cost
  }

  $('#mage_select').one('change', 'input', function() {
    listTable.dataTable({
      sPaginationType: 'full_numbers',
      sDom: 'fptil',
      aoColumnDefs: [{
        aTargets:[0],
        bSortable:true 
      }, {
        aTargets:[1,2],
        bSortable:false 
      }],
      fnRowCallback:function(nRow) {
        var tr = $(nRow)
        $('td:nth-child(2)', tr).text(getCardAmount(tr))
      }  
    })

    deckTable.dataTable({
      sPaginationType: 'full_numbers',
      sDom: 'fptil',
      aoColumnDefs: [{
        aTargets:[0],
        mData:function(data) {
          return data.name
        }
      }, {
        aTargets:[1],
        mData:function(data) {
          return "" + data.amount
        }
      }, {
        aTargets:[2],
        mData:function(data) {
          return data.amount * getCardCost(data.code)
        }
      }],
      fnRowCallback:function(nRow, aData) {
        $(nRow).attr('data-code', aData.code)
      }
    })
  })

  $('#mage_select input').on('change', function() {
    $('#tables_container').show()
    costHash = {}
  })

  var getListTr = function(code) {
    var trs = listTable.find('tbody tr[data-code='+ code + ']')
    return trs.length == 0 ? null : $(trs[0])
  }

  var schools = ['air', 'water', 'earth', 'fire', 'holy', 'dark', 'nature', 'arcane', 'war']
  var types = ['conjuration', 'incantation', 'creature', 'attack', 'enchantment', 'equipment']

  var getMage = function() {
    var input = $('#mage_select input:checked')
    var mage = {}
    $(schools).each(function(i, s) {
      mage[s] = input.data(s) || 2
    })
    return mage
  }

  var getDeckTr = function(code) {
    var trs =  deckTable.find('tbody tr[data-code='+ code + ']')
    return trs.length == 0 ? null : $(trs[0])
  }

  var getPackCardAmount = function(code_or_tr, deck) {
    listTr = code_or_tr.split ? getListTr(code) : code_or_tr
    return parseInt(listTr.data(deck) || '0') * parseInt($('#packs_container select[data-pack=' + deck + ']').val()) 
  }

  var getCardAmount = function(code_or_tr) {
    return getPackCardAmount(code_or_tr, 'core') + getPackCardAmount(code_or_tr, 'tome') 
  }

  var getCardMax = function(code) {
    var tr = getListTr(code)
    return Math.min(parseInt($('td:nth-child(2)', tr).text()), parseInt($('td:nth-child(3)', tr).text())) 
  }

  var getCardName = function(code) {
    return $('a', getListTr(code)).text()
  }

  $('#for_type input, #for_school input, #packs_container select').on('change', function() {
    listTable.dataTable().fnDraw(true)
  })

  var addCardToDeck = function(listTr) {
    var code = listTr.data('code') 
    deckTr = getDeckTr(code)
    var table = deckTable.dataTable()
    if(!deckTr) {
      table.fnAddData({
        code:code,
        amount:1,
        name:getCardName(code),
        type:listTr.data('type')
      })
    } else { 
      data = table.fnGetData(deckTr[0])
      data.amount = Math.min(data.amount + 1, getCardMax(code))
      table.fnUpdate(data, deckTr[0])
    } 
  }

  var updateCompositions = function() {
    var cost = 0
    var map = {}
    $.each(types, function(i, t) {
      map[t] = 0
    })

    $.each(deckTable.dataTable().fnGetData(), function(i, c) {
      if(c.amount > 0) {
        map[c.type] = map[c.type] + c.amount
        cost = cost + c.amount * getCardCost(c.code)
      }
    })

    $.each(map, function(k, v) {
      $("#total_cost_container span[data-type=" + k + "]").text("" + v)
    })

    $("#total_deck_cost").text(cost)
  }

  $(listTable).on('click', 'button', function() {
    addCardToDeck($(this).closest('tr'))

    updateCompositions()
  })
})
