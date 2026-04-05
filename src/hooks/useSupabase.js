import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseQuery(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { select = '*', order, limit, filters = [] } = options

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from(table).select(select)
      filters.forEach(({ column, op, value }) => {
        query = query.filter(column, op, value)
      })
      if (order) query = query.order(order.column, { ascending: order.ascending ?? false })
      if (limit) query = query.limit(limit)
      const { data: result, error: err } = await query
      if (err) throw err
      setData(result || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [table, select, JSON.stringify(order), limit, JSON.stringify(filters)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
