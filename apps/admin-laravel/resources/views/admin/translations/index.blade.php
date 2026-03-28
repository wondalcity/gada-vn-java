@extends('layouts.admin')
@section('title', '번역 관리 | GADA Admin')
@section('page-title', '번역 관리')

@section('content')

{{-- Filters --}}
<div class="bg-white rounded-lg border border-gray-200 mb-4 p-4">
  <form method="GET" action="/admin/translations" class="flex flex-wrap items-end gap-3">
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">언어</label>
      <select name="locale" class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
        @foreach($locales as $loc)
          <option value="{{ $loc }}" {{ $locale === $loc ? 'selected' : '' }}>{{ strtoupper($loc) }}</option>
        @endforeach
      </select>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">검색</label>
      <input type="text" name="q" value="{{ $search }}" placeholder="키 또는 값..."
             class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48">
    </div>
    <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">조회</button>
  </form>
</div>

@if(session('success'))
  <div class="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{{ session('success') }}</div>
@endif

{{-- Table --}}
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <table class="min-w-full text-sm">
    <thead class="bg-gray-50 text-gray-600 text-xs uppercase">
      <tr>
        <th class="px-4 py-3 text-left w-1/3">키</th>
        <th class="px-4 py-3 text-left">값</th>
        <th class="px-4 py-3 text-right w-24">수정</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      @forelse($translations as $row)
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ $row->key }}</td>
          <td class="px-4 py-3">
            <form method="POST" action="/admin/translations/{{ $row->locale }}__{{ urlencode($row->key) }}" class="flex gap-2">
              @csrf
              @method('PUT')
              <input type="text" name="value" value="{{ $row->value }}"
                     class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <button type="submit" class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">저장</button>
            </form>
          </td>
          <td class="px-4 py-3 text-right text-xs text-gray-400">{{ $row->locale }}</td>
        </tr>
      @empty
        <tr>
          <td colspan="3" class="px-4 py-8 text-center text-gray-400">번역 데이터가 없습니다.</td>
        </tr>
      @endforelse
    </tbody>
  </table>
</div>

<div class="mt-4">{{ $translations->links() }}</div>

@endsection
