const ctx = document.getElementById('doughnut')

let data = []

const rndRgb = (n) => {
  const colors = []
  var o = Math.round, r = Math.random, s = 255
  for (let i = 0; i < n; i++) {
    let tmp = [o(r() * s), o(r() * s), o(r() * s)]
    while (tmp[0] + tmp[1] + tmp[2] < 400) {
      tmp = [o(r() * s), o(r() * s), o(r() * s)]
    }
    colors.push(`rgb(${tmp[0]},${tmp[1]},${tmp[2]})`)
  }
  return colors
}

Chart.register(ChartDataLabels)

const chart = new Chart(ctx, {
  type: 'doughnut',
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        boxPadding: 5,
        footerAlign: 'center',
      }
    }
  }
})

const table = new Tabulator("#table", {
  data: [],
  layout: "fitColumns",
  pagination: "local",
  paginationSize: 20,
  autoColumns: true,
})

let authToken = ''

const updateData = async () => {
  const response = await fetch(`/api/detailed?auth=${authToken}`)
  if ((response).ok) {
    data = await response.json()
    chart.data = {
      labels: data.map(item => item.currency),
      datasets: [
        {
          data: data.map(item => item.usd_amount),
          backgroundColor: rndRgb(data.length),
        },
      ],
      ticks: data.map(item => item.amount),
    }
    chart.options.plugins.tooltip.callbacks = {
      label: (context) => {
        let sum = 0
        let dataArr = context.dataset.data
        dataArr.map(data => {
          sum += parseFloat(data)
        })
        let percentage = `~ ${context.parsed.toFixed(4)} USD (${(context.parsed * 100 / sum).toFixed(2)}%)`
        return percentage
      },
      footer: (context) => {
        return `${data.map(item => item.amount)[context[0].dataIndex]} ${data.map(item => item.currency)[context[0].dataIndex]}`
      },
    }
    chart.options.plugins.datalabels = {
      color: 'white',
      formatter: (value, context) => {
        let percentage = `${data.map(item => item.currency)[context.dataIndex]}`
        return percentage
      },
      labels: {
        title: {
          anchor: 'center',
          display: 'auto',
          font: {
            weight: 'bold',
            size: '18px'
          }
        },
      }
    }
    chart.update()
    table.setData(data)
  } else {
    authToken = prompt("Unauthorized, please provide authorization token")
    updateData()
  }
}
updateData()
